# FraudShield Decisioner Service Implementation Guide

## Overview

The Decisioner Service is a critical component in the FraudShield platform, responsible for making the final decision on transactions based on risk scores from the Evaluator Service. It consumes events from the Redpanda topic `risk_scores`, applies merchant-specific configurations, records decisions in the database, and makes them available through the API.

## Service Architecture

### Key Responsibilities

1. **Risk Score Consumption**: Process risk scores from the Redpanda `risk_scores` topic
2. **Decision Making**: Apply merchant-specific thresholds to determine transaction disposition
3. **Database Persistence**: Store transaction details and decisions in PostgreSQL
4. **API Exposure**: Make decisions available via REST API for merchants
5. **Webhook Notifications**: Send notifications to merchant systems based on configured webhooks

### Technology Stack

- **Runtime**: Node.js v22+ with TypeScript
- **Framework**: Fastify for HTTP API
- **ORM**: Prisma for database access
- **Database**: PostgreSQL
- **Event Streaming**: Redpanda (Kafka API compatible)
- **Caching**: Redis for merchant configurations and recent decisions

## Implementation Structure

```
decisioner/
├── src/
│   ├── index.ts                 # Entry point
│   ├── config/                  # Configuration management
│   ├── server/                  # Fastify server setup
│   ├── services/                # External service integrations
│   │   ├── event-consumer.ts    # Redpanda consumer
│   │   ├── event-producer.ts    # Redpanda producer
│   │   ├── redis-client.ts      # Redis client
│   │   └── webhook.ts           # Webhook notification service
│   ├── core/
│   │   ├── decisioner.ts        # Main decision logic
│   │   ├── merchant-config.ts   # Merchant config management
│   │   └── decision-rules.ts    # Decision rules engine
│   ├── db/
│   │   ├── prisma.ts            # Prisma client
│   │   ├── schema.prisma        # Prisma schema
│   │   └── repositories/        # Database repositories
│   ├── utils/
│   │   ├── logger.ts            # Logging utility
│   │   └── metrics.ts           # Metrics collection
│   └── types/                   # Type definitions
├── test/                        # Tests
├── Dockerfile                   # Container definition
└── package.json                 # Dependencies and scripts
```

## Core Components

### Main Decisioner Logic (core/decisioner.ts)

```typescript
import { v4 as uuidv4 } from 'uuid';
import { MerchantConfigService } from './merchant-config';
import { EventProducer } from '../services/event-producer';
import { WebhookService } from '../services/webhook';
import { RedisClient } from '../services/redis-client';
import { TransactionRepository } from '../db/repositories/transaction-repository';
import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';
import { RiskScore, Decision, WebhookPayload } from '../types/events';

export interface DecisionerOptions {
  merchantConfigService: MerchantConfigService;
  transactionRepository: TransactionRepository;
  webhookService: WebhookService;
  redis: RedisClient;
  producer?: EventProducer;
}

export class Decisioner {
  private merchantConfigService: MerchantConfigService;
  private transactionRepository: TransactionRepository;
  private webhookService: WebhookService;
  private redis: RedisClient;
  private producer?: EventProducer;

  constructor(options: DecisionerOptions) {
    this.merchantConfigService = options.merchantConfigService;
    this.transactionRepository = options.transactionRepository;
    this.webhookService = options.webhookService;
    this.redis = options.redis;
    this.producer = options.producer;
  }

  /**
   * Process a risk score and make a decision
   */
  public async processRiskScore(riskScore: RiskScore): Promise<Decision> {
    const startTime = Date.now();
    
    try {
      logger.debug('Processing risk score', { 
        evaluationId: riskScore.evaluationId,
        merchantId: riskScore.merchantId,
        score: riskScore.score
      });
      
      // Record incoming risk score metric
      metrics.riskScoreCounter.inc({ merchantId: riskScore.merchantId });
      
      // Step 1: Get merchant configuration
      const merchantConfig = await this.merchantConfigService.getConfig(riskScore.merchantId);
      
      if (!merchantConfig) {
        throw new Error(`Merchant configuration not found for ${riskScore.merchantId}`);
      }
      
      // Step 2: Make decision based on merchant threshold
      let decision: 'approve' | 'reject' | 'review' = 'approve';
      
      if (riskScore.score >= merchantConfig.highRiskThreshold) {
        decision = 'reject';
      } else if (riskScore.score >= merchantConfig.reviewThreshold) {
        decision = 'review';
      }
      
      // Step 3: Create transaction record
      const transaction = await this.transactionRepository.createTransaction({
        evaluationId: riskScore.evaluationId,
        merchantId: riskScore.merchantId,
        sessionId: riskScore.sessionId,
        orderId: riskScore.orderId,
        fingerprintVisitorId: riskScore.fingerprintVisitorId,
        riskScore: riskScore.score,
        isFraud: riskScore.isFraud,
        riskFactors: riskScore.riskFactors,
        decision,
        reviewStatus: decision === 'review' ? 'pending' : null,
      });
      
      // Step 4: Cache the decision for quick lookups
      if (riskScore.orderId) {
        await this.cacheDecision(riskScore.merchantId, riskScore.orderId, {
          decision,
          riskScore: riskScore.score,
          evaluationId: riskScore.evaluationId,
          timestamp: Date.now(),
        });
      }
      
      // Step 5: Send webhook notification if configured
      if (merchantConfig.webhookUrl) {
        const webhookPayload: WebhookPayload = {
          id: uuidv4(),
          eventType: 'transaction.decision',
          merchantId: riskScore.merchantId,
          orderId: riskScore.orderId,
          transactionId: transaction.id,
          evaluationId: riskScore.evaluationId,
          decision,
          riskScore: riskScore.score,
          isFraud: riskScore.isFraud,
          riskFactors: riskScore.riskFactors,
          timestamp: Date.now(),
        };
        
        // Don't await - fire and forget
        this.webhookService
          .sendWebhook(merchantConfig.webhookUrl, webhookPayload)
          .catch(error => logger.error('Webhook send failed', { error }));
      }
      
      // Calculate and record processing time
      const processingTime = Date.now() - startTime;
      metrics.processingTime.observe(processingTime);
      
      logger.info('Decision made successfully', { 
        evaluationId: riskScore.evaluationId,
        decision,
        processingTime,
      });
      
      // Return decision
      return {
        orderId: riskScore.orderId,
        riskScore: riskScore.score,
        isFraud: riskScore.isFraud,
        recommendation: decision,
        evaluationId: riskScore.evaluationId,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('Error processing risk score', { error });
      metrics.errorCounter.inc({ type: 'processing_error' });
      
      // Return a safe default decision in case of error
      return {
        orderId: riskScore.orderId,
        riskScore: riskScore.score,
        isFraud: true,
        recommendation: 'review', // Default to review on error
        evaluationId: riskScore.evaluationId,
        timestamp: Date.now(),
        error: 'Processing error',
      };
    }
  }

  /**
   * Get a decision for an order ID
   */
  public async getDecision(merchantId: string, orderId: string): Promise<Decision | null> {
    try {
      // First check cache
      const cachedDecision = await this.getCachedDecision(merchantId, orderId);
      if (cachedDecision) {
        return cachedDecision;
      }
      
      // If not in cache, check database
      const transaction = await this.transactionRepository.findByOrderId(merchantId, orderId);
      
      if (!transaction) {
        return null;
      }
      
      // Create response and cache it
      const decision: Decision = {
        orderId,
        riskScore: transaction.riskScore,
        isFraud: transaction.isFraud,
        recommendation: transaction.decision as 'approve' | 'reject' | 'review',
        evaluationId: transaction.evaluationId,
        timestamp: transaction.createdAt.getTime(),
      };
      
      // Cache for future lookups
      await this.cacheDecision(merchantId, orderId, decision);
      
      return decision;
    } catch (error) {
      logger.error('Error getting decision', { merchantId, orderId, error });
      return null;
    }
  }

  /**
   * Cache decision for quick lookups
   */
  private async cacheDecision(
    merchantId: string,
    orderId: string,
    decision: Decision
  ): Promise<void> {
    try {
      const key = `decision:${merchantId}:${orderId}`;
      await this.redis.set(key, JSON.stringify(decision));
      await this.redis.expire(key, 86400); // 24 hour expiration
    } catch (error) {
      logger.warn('Failed to cache decision', { merchantId, orderId, error });
    }
  }

  /**
   * Get cached decision
   */
  private async getCachedDecision(
    merchantId: string,
    orderId: string
  ): Promise<Decision | null> {
    try {
      const key = `decision:${merchantId}:${orderId}`;
      const cached = await this.redis.get(key);
      
      if (cached) {
        return JSON.parse(cached) as Decision;
      }
      
      return null;
    } catch (error) {
      logger.warn('Failed to get cached decision', { merchantId, orderId, error });
      return null;
    }
  }
}
```

## Performance Optimizations

To maintain the required ≤ 150ms P95 latency, the Decisioner Service implements several performance optimizations:

1. **Redis Caching**
   - Merchant configurations are cached for quick lookups
   - Transaction decisions are cached to avoid database queries
   - Cache expirations are tuned based on data volatility

2. **Asynchronous Processing**
   - Webhook notifications are sent asynchronously without blocking
   - Database writes to the transaction log don't block API responses

3. **Database Optimizations**
   - Optimized indexes on frequently queried fields
   - Table partitioning for transaction data by date
   - Connection pooling to minimize connection overhead

4. **Request Prioritization**
   - Critical API paths (order decision lookups) are optimized
   - Resource-intensive operations run at lower priority

## API Endpoints

The Decisioner Service exposes the following API endpoints:

### 1. Get Decision for Order

```
GET /v1/decision/:orderId
```

**Description**: Retrieves the fraud decision for a specific order ID.

**Authentication**: API Key required in `X-API-Key` header.

**Path Parameters**:
- `orderId` - ID of the order to check

**Response**:
```json
{
  "orderId": "order_12345",
  "riskScore": 45,
  "isFraud": false,
  "recommendation": "approve",
  "evaluationId": "c7f3d12e-5a7d-4f3b-b24e-78a234560dfc",
  "timestamp": 1625176907000
}
```

### 2. Update Transaction Review

```
PUT /v1/transactions/:id/review
```

**Description**: Updates the review status of a transaction.

**Authentication**: JWT Bearer token required.

**Path Parameters**:
- `id` - ID of the transaction

**Request Body**:
```json
{
  "reviewStatus": "approved",
  "notes": "Verified customer via phone"
}
```

**Response**:
```json
{
  "id": "e2d9f4a7-c8b6-4f3b-b24e-78a234560abc",
  "reviewStatus": "approved",
  "reviewedAt": "2023-07-02T15:22:45.000Z",
  "reviewedBy": "user_123"
}
```

## Webhook Integration

The Decisioner Service can send webhook notifications to merchant systems when decisions are made. The webhook payload is signed using HMAC-SHA256 for security.

**Example Webhook Payload**:
```json
{
  "id": "webhook_1234567890",
  "eventType": "transaction.decision",
  "merchantId": "merchant_123456",
  "orderId": "order_12345",
  "transactionId": "e2d9f4a7-c8b6-4f3b-b24e-78a234560abc",
  "evaluationId": "c7f3d12e-5a7d-4f3b-b24e-78a234560dfc",
  "decision": "approve",
  "riskScore": 45,
  "isFraud": false,
  "riskFactors": ["new_device", "unusual_time"],
  "timestamp": 1625176907000
}
```

**Security Headers**:
- `X-FraudShield-Signature`: HMAC-SHA256 signature of the payload
- `X-FraudShield-Timestamp`: Unix timestamp when the webhook was sent

## Merchant Configuration

Merchant-specific configurations allow for customized decision thresholds and behavior. These settings can be managed through the dashboard API:

```json
{
  "highRiskThreshold": 90,     // Threshold for automatic rejection
  "reviewThreshold": 70,      // Threshold for manual review
  "enableCaptcha": true,      // Enable CAPTCHA challenges
  "captchaThreshold": 80,     // Threshold for CAPTCHA challenges
  "ipAnonymization": false,   // Whether to anonymize IP addresses
  "webhookUrl": "https://example.com/fraud-webhooks",
  "notificationEmail": "fraud-alerts@example.com"
}
```

## Monitoring and Observability

The Decisioner Service includes comprehensive monitoring:

1. **Prometheus Metrics**:
   - Decision counts by type (approve/reject/review)
   - Processing time histograms
   - Error rates and types
   - Cache hit/miss rates

2. **Health Checks**:
   - Database connectivity
   - Redpanda connectivity
   - Redis cache availability

3. **Alerting**:
   - High error rate alerts
   - Processing time threshold alerts
   - Queue backlog alerts

## Operational Considerations

### Scaling

The Decisioner Service is designed to scale horizontally:

1. **Consumer Groups**:
   - Multiple instances form a consumer group for the `risk_scores` topic
   - Each instance processes a subset of partitions

2. **Database Connection Pooling**:
   - Each instance maintains an optimal number of database connections
   - Connection pools are sized based on instance resources

3. **Auto-scaling**:
   - Instances can be added/removed based on CPU usage and queue depth
   - Scale up during peak hours and scale down during low-traffic periods

### Disaster Recovery

1. **Data Persistence**:
   - All decisions are stored in PostgreSQL with backups
   - Event log is maintained in Redpanda with appropriate retention

2. **Recovery Procedures**:
   - Services can be restarted with minimal data loss
   - Consumer groups maintain offsets for reliable processing

3. **Circuit Breakers**:
   - Protect against cascading failures from dependent services
   - Graceful degradation when non-critical services are unavailable

## Configuration

The Decisioner Service is configured through environment variables:

```
# Required Configuration
REDPANDA_BROKERS=redpanda:9092       # Comma-separated list of Redpanda brokers
KAFKA_RISK_SCORES_TOPIC=risk_scores  # Topic to consume risk scores from
POSTGRES_HOST=postgres               # PostgreSQL host
POSTGRES_PORT=5432                   # PostgreSQL port
POSTGRES_DB=fraudshield              # PostgreSQL database name
POSTGRES_USER=app                    # PostgreSQL user
POSTGRES_PASSWORD=password           # PostgreSQL password
REDIS_URL=redis://redis:6379         # Redis connection URL

# Optional Configuration
PORT=3002                            # Server port (default: 3002)
LOG_LEVEL=info                       # Logging level (default: info)
METRICS_ENABLED=true                 # Enable Prometheus metrics (default: true)
METRICS_PATH=/metrics                # Path for metrics endpoint (default: /metrics)
CACHE_TTL=86400                      # Cache TTL in seconds (default: 86400)
```

### Database Schema and Table Structure

The service relies on the following database tables:

- `transactions`: Stores transaction data and risk assessments
- `merchants`: Stores merchant configuration and rules
- `rules`: Stores fraud detection rules
- `audit_logs`: Stores decision audit trail

## Integration with Other Services

The Decisioner Service integrates with:

1. **Redpanda**: Consumes `risk_scores` topic for new risk evaluations
2. **PostgreSQL**: Stores transaction data and merchant configurations
3. **Redis**: Caches risk scores and decisions for quick lookups
4. **Custom Fingerprint Service**: Used indirectly through risk scores

## Conclusion

The Decisioner Service is designed to provide fast, reliable fraud decisions based on risk scores from the Evaluator Service. Its focus on performance optimization, reliability, and merchant-specific configuration allows it to serve as the critical final step in the fraud detection pipeline while meeting the strict performance requirements of P95 latency ≤ 150ms.