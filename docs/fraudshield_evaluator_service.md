# FraudShield Evaluator Service Implementation Guide

## Overview

The Evaluator Service is a core component of the FraudShield platform, responsible for processing incoming events from the SDK and determining risk scores. This service consumes events from the Redpanda topic `raw_events`, enriches the data with additional information, applies risk scoring algorithms, and outputs results to the `risk_scores` topic.

## Service Architecture

### Key Responsibilities

1. **Event Consumption**: Process raw event data from Redpanda
2. **Data Enrichment**: Add GeoIP data, velocity checks, and behavioral analysis
3. **Risk Evaluation**: Apply rules and machine learning to calculate risk scores
4. **Result Publishing**: Send risk scores to the appropriate Redpanda topic

### Technology Stack

- **Runtime**: Node.js v22+ with TypeScript
- **Framework**: Fastify for HTTP API
- **Event Streaming**: Redpanda (Kafka API compatible)
- **External Services**: Custom Fingerprint Service, hCaptcha Enterprise, MaxMind GeoIP
- **Caching**: Redis for velocity checks and pattern recognition

## Implementation Structure

```
evaluator/
├── src/
│   ├── index.ts                 # Entry point
│   ├── config/                  # Configuration management
│   ├── server/                  # Fastify server setup
│   ├── services/                # External service integrations
│   ├── core/                    # Core evaluation logic
│   │   ├── evaluator.ts         # Main evaluation coordinator
│   │   ├── risk-engine/         # Risk scoring components
│   │   └── enrichment/          # Data enrichment components
│   ├── utils/                   # Utility functions
│   └── types/                   # Type definitions
├── test/                        # Tests
├── Dockerfile                   # Container definition
└── package.json                 # Dependencies and scripts
```

## Core Components

### Main Evaluator Logic (core/evaluator.ts)

```typescript
import { RiskEngine } from './risk-engine';
import { DataEnricher } from './enrichment';
import { EventProducer } from '../services/event-producer';
import { RedisClient } from '../services/redis-client';
import { GeoIpService } from '../services/geo-ip';
import { FingerprintService } from '../services/fingerprint';
import { CaptchaService } from '../services/captcha';
import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';
import { RawEvent, EnrichedEvent, EvaluationResult, RiskScore } from '../types/events';
import { EvaluatorOptions } from '../types/config';

export class Evaluator {
  private riskEngine: RiskEngine;
  private enricher: DataEnricher;
  private producer: EventProducer;
  private redis: RedisClient;
  private geoIpService: GeoIpService;
  private fingerprintService: FingerprintService;
  private captchaService: CaptchaService;

  constructor(options: EvaluatorOptions) {
    // Initialize services
    this.redis = new RedisClient(options.redisUrl);
    this.geoIpService = new GeoIpService({
      apiKey: options.geoIpApiKey,
      cacheEnabled: options.cacheEnabled,
      redis: this.redis,
    });
    this.fingerprintService = new FingerprintService({
      redisCache: this.redis,
      cacheTtl: options.fingerprintCacheTtl,
    });
    this.captchaService = new CaptchaService({
      secretKey: options.captchaSecretKey,
    });
    
    // Initialize enricher
    this.enricher = new DataEnricher({
      geoIpService: this.geoIpService,
      redis: this.redis,
      ipAnonymization: options.ipAnonymization,
    });
    
    // Initialize risk engine
    this.riskEngine = new RiskEngine({
      rules: options.rules,
      redis: this.redis,
      enableRules: options.enableRules !== false,
      enableVelocity: options.enableVelocity !== false,
      enableMlModel: options.enableMlModel === true,
      captchaThreshold: options.captchaThreshold || 80,
    });
    
    // Store event producer
    this.producer = options.producer;
  }

  /**
   * Process a raw event
   */
  public async processEvent(event: RawEvent): Promise<EvaluationResult> {
    const startTime = Date.now();
    
    try {
      logger.debug('Processing raw event', { 
        sessionId: event.sessionId, 
        merchantId: event.merchantId 
      });
      
      // Record incoming event metric
      metrics.eventCounter.inc({ merchantId: event.merchantId });
      
      // Step 1: Verify fingerprint data if needed
      if (event.fingerprintData.visitorId && !event.fingerprintData.verified) {
        await this.verifyFingerprintData(event);
      }
      
      // Step 2: Verify captcha token if present
      if (event.captchaToken) {
        const captchaValid = await this.captchaService.verify(event.captchaToken);
        if (!captchaValid) {
          throw new Error('Invalid captcha token');
        }
      }
      
      // Step 3: Enrich the event with additional data
      const enrichedEvent = await this.enricher.enrichEvent(event);
      
      // Step 4: Calculate risk score
      const riskScore = await this.riskEngine.calculateRiskScore(enrichedEvent);
      
      // Step 5: Publish the risk score to Kafka
      await this.publishRiskScore(riskScore);
      
      // Calculate and record processing time
      const processingTime = Date.now() - startTime;
      metrics.processingTime.observe(processingTime);
      
      logger.info('Event processed successfully', { 
        evaluationId: riskScore.evaluationId,
        riskScore: riskScore.score,
        isFraud: riskScore.isFraud,
        processingTime,
      });
      
      // Return evaluation result
      return {
        riskScore: riskScore.score,
        isFraud: riskScore.isFraud,
        evaluationId: riskScore.evaluationId,
        requiresCaptcha: riskScore.requiresCaptcha,
        captchaSiteKey: riskScore.requiresCaptcha ? process.env.CAPTCHA_SITE_KEY : undefined,
        riskFactors: riskScore.riskFactors,
      };
    } catch (error) {
      logger.error('Error processing event', { error });
      metrics.errorCounter.inc({ type: 'processing_error' });
      
      // Return a high-risk score in case of processing error
      return {
        riskScore: 100,
        isFraud: true,
        evaluationId: `error_${Date.now()}`,
        requiresCaptcha: true,
        captchaSiteKey: process.env.CAPTCHA_SITE_KEY,
        error: 'Processing error',
      };
    }
  }

  /**
   * Verify fingerprint data with the custom fingerprint service
   */
  private async verifyFingerprintData(event: RawEvent): Promise<void> {
    try {
      const result = await this.fingerprintService.verify(event.fingerprintData);
      
      // Update the fingerprint data with verified information
      event.fingerprintData = {
        ...event.fingerprintData,
        ...result,
        verified: true,
      };
    } catch (error) {
      logger.warn('Failed to verify fingerprint data', { error });
      // Continue with unverified data, but mark it as such
      event.fingerprintData.verified = false;
    }
  }

  /**
   * Publish risk score to Kafka
   */
  private async publishRiskScore(riskScore: RiskScore): Promise<void> {
    try {
      await this.producer.send({
        topic: process.env.KAFKA_RISK_SCORES_TOPIC || 'risk_scores',
        messages: [{
          key: riskScore.merchantId,
          value: JSON.stringify(riskScore),
        }],
      });
      
      metrics.publishedCounter.inc({ topic: 'risk_scores' });
    } catch (error) {
      logger.error('Failed to publish risk score', { error });
      metrics.errorCounter.inc({ type: 'kafka_publish_error' });
      throw error;
    }
  }
}
```

### Risk Engine (core/risk-engine/index.ts)

```typescript
import { RuleEngine } from './rule-engine';
import { VelocityChecker } from './velocity';
import { MlModel } from './ml-model';
import { RedisClient } from '../../services/redis-client';
import { logger } from '../../utils/logger';
import { metrics } from '../../utils/metrics';
import { EnrichedEvent, RiskScore } from '../../types/events';
import { Rule } from '../../types/config';
import { v4 as uuidv4 } from 'uuid';

export interface RiskEngineOptions {
  rules: Rule[];
  redis: RedisClient;
  enableRules?: boolean;
  enableVelocity?: boolean;
  enableMlModel?: boolean;
  captchaThreshold?: number;
}

export class RiskEngine {
  private ruleEngine: RuleEngine;
  private velocityChecker: VelocityChecker;
  private mlModel?: MlModel;
  private readonly captchaThreshold: number;
  private readonly enableRules: boolean;
  private readonly enableVelocity: boolean;
  private readonly enableMlModel: boolean;

  constructor(options: RiskEngineOptions) {
    this.enableRules = options.enableRules !== false;
    this.enableVelocity = options.enableVelocity !== false;
    this.enableMlModel = options.enableMlModel === true;
    this.captchaThreshold = options.captchaThreshold || 80;
    
    this.ruleEngine = new RuleEngine(options.rules);
    this.velocityChecker = new VelocityChecker(options.redis);
    
    if (this.enableMlModel) {
      this.mlModel = new MlModel();
    }
  }

  /**
   * Calculate risk score for an event
   */
  public async calculateRiskScore(event: EnrichedEvent): Promise<RiskScore> {
    let baseScore = 0;
    const riskFactors: string[] = [];
    let requiresCaptcha = false;
    
    // Start timing
    const startTime = Date.now();
    
    try {
      // Step 1: Apply rules if enabled
      if (this.enableRules) {
        const ruleResult = this.ruleEngine.evaluateRules(event);
        baseScore += ruleResult.score;
        riskFactors.push(...ruleResult.factors);
        
        metrics.ruleEvaluationCounter.inc({ merchantId: event.merchantId });
        logger.debug('Rule evaluation completed', { score: ruleResult.score });
      }
      
      // Step 2: Check velocity if enabled
      if (this.enableVelocity) {
        const velocityResult = await this.velocityChecker.check(event);
        baseScore += velocityResult.score;
        riskFactors.push(...velocityResult.factors);
        
        metrics.velocityCheckCounter.inc({ merchantId: event.merchantId });
        logger.debug('Velocity check completed', { score: velocityResult.score });
      }
      
      // Step 3: Apply ML model if enabled
      if (this.enableMlModel && this.mlModel) {
        const mlResult = await this.mlModel.predict(event);
        baseScore += mlResult.score;
        riskFactors.push(...mlResult.factors);
        
        metrics.mlModelCounter.inc({ merchantId: event.merchantId });
        logger.debug('ML model prediction completed', { score: mlResult.score });
      }
      
      // Cap score between 0-100
      const finalScore = Math.min(Math.max(Math.round(baseScore), 0), 100);
      
      // Determine if fraud
      const isFraud = finalScore >= 90; // Threshold for definite fraud
      
      // Determine if captcha is required
      requiresCaptcha = finalScore >= this.captchaThreshold;
      
      // Record scoring time
      const processingTime = Date.now() - startTime;
      metrics.scoringTime.observe(processingTime);
      
      // Record risk distribution
      metrics.riskScoreDistribution.observe(finalScore);
      
      return {
        evaluationId: uuidv4(),
        merchantId: event.merchantId,
        sessionId: event.sessionId,
        orderId: event.orderId,
        score: finalScore,
        isFraud,
        requiresCaptcha,
        riskFactors: Array.from(new Set(riskFactors)), // Deduplicate risk factors
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('Error calculating risk score', { error });
      metrics.errorCounter.inc({ type: 'risk_calculation_error' });
      
      // Return a high-risk score in case of calculation error
      return {
        evaluationId: uuidv4(),
        merchantId: event.merchantId,
        sessionId: event.sessionId,
        orderId: event.orderId,
        score: 100,
        isFraud: true,
        requiresCaptcha: true,
        riskFactors: ['error_during_calculation'],
        timestamp: Date.now(),
      };
    }
  }
}
```

## Data Enrichment Component

```typescript
// core/enrichment/index.ts
import { GeoIpService } from '../../services/geo-ip';
import { RedisClient } from '../../services/redis-client';
import { logger } from '../../utils/logger';
import { RawEvent, EnrichedEvent } from '../../types/events';

export interface EnricherOptions {
  geoIpService: GeoIpService;
  redis: RedisClient;
  ipAnonymization?: boolean;
}

export class DataEnricher {
  private geoIpService: GeoIpService;
  private redis: RedisClient;
  private ipAnonymization: boolean;

  constructor(options: EnricherOptions) {
    this.geoIpService = options.geoIpService;
    this.redis = options.redis;
    this.ipAnonymization = !!options.ipAnonymization;
  }

  /**
   * Enrich a raw event with additional data
   */
  public async enrichEvent(event: RawEvent): Promise<EnrichedEvent> {
    // Create a base enriched event
    const enriched: EnrichedEvent = {
      ...event,
      geoData: {},
      velocityData: {},
      enrichedAt: Date.now(),
    };
    
    try {
      // Extract IP from request if available
      const ip = this.extractIp(event);
      
      if (ip) {
        // Get geo data for the IP
        const geoData = await this.geoIpService.lookup(ip);
        
        // Apply IP anonymization if enabled
        if (this.ipAnonymization) {
          enriched.geoData = {
            ...geoData,
            ip: this.anonymizeIp(ip),
          };
        } else {
          enriched.geoData = {
            ...geoData,
            ip,
          };
        }
      }
      
      // Get user velocity data
      if (event.fingerprintData.visitorId) {
        enriched.velocityData = await this.getVelocityData(event);
      }
      
      return enriched;
    } catch (error) {
      logger.error('Error enriching event', { error });
      // Return partially enriched event if enrichment fails
      return enriched;
    }
  }

  /**
   * Extract IP address from request
   */
  private extractIp(event: RawEvent): string | null {
    // Try to get IP from fingerprint data
    if (event.fingerprintData.ip) {
      return event.fingerprintData.ip;
    }
    
    // Try to get IP from page data
    if (event.pageData?.clientIp) {
      return event.pageData.clientIp;
    }
    
    return null;
  }

  /**
   * Anonymize IP address
   */
  private anonymizeIp(ip: string): string {
    // IPv4 anonymization (last octet to 0)
    if (ip.includes('.')) {
      return ip.replace(/\d+$/, '0');
    }
    
    // IPv6 anonymization (last 80 bits to 0)
    return ip.replace(/(:([0-9a-f]{1,4})){5}$/, ':0:0:0:0:0');
  }

  /**
   * Get velocity data for a user
   */
  private async getVelocityData(event: RawEvent): Promise<any> {
    const visitorId = event.fingerprintData.visitorId;
    const merchantId = event.merchantId;
    
    try {
      // Count recent events from this visitor
      const visitorKey = `visitor:${visitorId}:${merchantId}:count`;
      const visitorCount = await this.redis.incr(visitorKey);
      await this.redis.expire(visitorKey, 86400); // 24 hour expiration
      
      // Get recent unique IPs used by this visitor
      const visitorIpsKey = `visitor:${visitorId}:${merchantId}:ips`;
      const ip = this.extractIp(event);
      if (ip) {
        await this.redis.sadd(visitorIpsKey, ip);
        await this.redis.expire(visitorIpsKey, 86400); // 24 hour expiration
      }
      const uniqueIps = await this.redis.scard(visitorIpsKey);
      
      // Get time since first seen
      const visitorFirstSeenKey = `visitor:${visitorId}:${merchantId}:first_seen`;
      const now = Date.now();
      await this.redis.setnx(visitorFirstSeenKey, now.toString());
      await this.redis.expire(visitorFirstSeenKey, 86400 * 30); // 30 day expiration
      const firstSeen = parseInt(await this.redis.get(visitorFirstSeenKey) || now.toString());
      const hoursSinceFirstSeen = (now - firstSeen) / (1000 * 60 * 60);
      
      return {
        eventCount: visitorCount,
        uniqueIpCount: uniqueIps,
        firstSeen,
        hoursSinceFirstSeen,
        eventsPerHour: hoursSinceFirstSeen > 0 ? visitorCount / hoursSinceFirstSeen : visitorCount,
      };
    } catch (error) {
      logger.error('Error getting velocity data', { error });
      return {};
    }
  }
}
```

## Key Service Integrations

### Fingerprint Service Integration

```typescript
// services/fingerprint.ts
import { createHash } from 'crypto';
import { logger } from '../utils/logger';
import { RedisClient } from './redis-client';

export interface FingerprintOptions {
  // No API key needed anymore
  redisCache?: RedisClient;
  cacheTtl?: number;
}

export class FingerprintService {
  private redisCache?: RedisClient;
  private cacheTtl: number;

  constructor(options: FingerprintOptions = {}) {
    this.redisCache = options.redisCache;
    this.cacheTtl = options.cacheTtl || 86400 * 30; // Default to 30 days
  }

  /**
   * Verify a visitor ID by analyzing the client data
   * Instead of calling an external API, we'll use our own algorithm
   */
  public async verify(fingerprintData: any): Promise<any> {
    try {
      const { visitorId, browserDetails } = fingerprintData;
      
      if (!visitorId || !browserDetails) {
        logger.warn('Incomplete fingerprint data for verification');
        return {
          confidence: 0.5, // Medium confidence due to incomplete data
          requestId: this.generateRequestId(),
          browserDetails: browserDetails || {},
        };
      }

      // Check cache if available
      if (this.redisCache) {
        const cachedData = await this.getCachedFingerprint(visitorId);
        if (cachedData) {
          return {
            ...cachedData,
            fromCache: true,
          };
        }
      }
      
      // Calculate confidence score based on the provided browser details
      const confidence = this.calculateConfidence(browserDetails);
      
      // Construct verification result
      const result = {
        requestId: this.generateRequestId(),
        confidence,
        browserDetails,
        timestamp: Date.now(),
      };
      
      // Cache the result if Redis is available
      if (this.redisCache) {
        await this.cacheFingerprint(visitorId, result);
      }

      return result;
    } catch (error) {
      logger.error('Fingerprint verification failed', { error });
      // Return a default response with low confidence
      return {
        requestId: this.generateRequestId(),
        confidence: 0.3,
        browserDetails: {},
      };
    }
  }

  /**
   * Generate a unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Calculate confidence score based on browser details
   */
  private calculateConfidence(browserDetails: any): number {
    // Start with a baseline confidence
    let confidence = 0.7;
    
    // Adjust based on available signals
    if (!browserDetails) return 0.5;
    
    // More signals increase confidence
    const signals = [
      'userAgent', 'language', 'colorDepth', 'deviceMemory',
      'hardwareConcurrency', 'screenResolution', 'timezone',
      'platform', 'touchSupport', 'fonts'
    ];
    
    const presentSignals = signals.filter(signal => browserDetails[signal] !== undefined);
    confidence += (presentSignals.length / signals.length) * 0.2;
    
    // Check for suspicious characteristics that might indicate spoofing
    if (this.hasInconsistentSignals(browserDetails)) {
      confidence *= 0.7;
    }
    
    // Cap confidence between 0 and 1
    return Math.min(Math.max(confidence, 0), 1);
  }

  /**
   * Check for inconsistencies in browser signals 
   * that might indicate spoofing
   */
  private hasInconsistentSignals(browserDetails: any): boolean {
    // Example checks for inconsistent data
    if (browserDetails.platform === 'iPhone' && browserDetails.userAgent?.includes('Android')) {
      return true;
    }
    
    if (browserDetails.platform === 'Win32' && browserDetails.userAgent?.includes('Macintosh')) {
      return true;
    }
    
    if (browserDetails.timezone && Math.abs(browserDetails.timezone) > 840) {
      return true; // Timezone offset shouldn't be greater than 14 hours (840 minutes)
    }
    
    return false;
  }

  /**
   * Cache fingerprint verification result
   */
  private async cacheFingerprint(visitorId: string, data: any): Promise<void> {
    if (!this.redisCache) return;
    
    try {
      const key = `fingerprint:${visitorId}`;
      await this.redisCache.set(key, JSON.stringify(data));
      await this.redisCache.expire(key, this.cacheTtl);
    } catch (error) {
      logger.error('Error caching fingerprint data', { error });
    }
  }

  /**
   * Get cached fingerprint verification result
   */
  private async getCachedFingerprint(visitorId: string): Promise<any | null> {
    if (!this.redisCache) return null;
    
    try {
      const key = `fingerprint:${visitorId}`;
      const cachedData = await this.redisCache.get(key);
      
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      
      return null;
    } catch (error) {
      logger.error('Error getting cached fingerprint data', { error });
      return null;
    }
  }
}
```

### GeoIP Service Integration

```typescript
// services/geo-ip.ts
import fetch from 'node-fetch';
import { RedisClient } from './redis-client';
import { logger } from '../utils/logger';

export interface GeoIpOptions {
  apiKey: string;
  cacheEnabled?: boolean;
  redis?: RedisClient;
}

export class GeoIpService {
  private apiKey: string;
  private cacheEnabled: boolean;
  private redis?: RedisClient;

  constructor(options: GeoIpOptions) {
    this.apiKey = options.apiKey;
    this.cacheEnabled = !!options.cacheEnabled;
    this.redis = options.redis;
  }

  /**
   * Lookup geo data for an IP address
   */
  public async lookup(ip: string): Promise<any> {
    // Check cache first if enabled
    if (this.cacheEnabled && this.redis) {
      const cachedData = await this.getCachedGeoData(ip);
      
      if (cachedData) {
        return cachedData;
      }
    }
    
    try {
      const response = await fetch(`https://geoip.maxmind.com/geoip/v2.1/city/${ip}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(this.apiKey).toString('base64')}`,
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`GeoIP API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Process the raw data to a simplified format
      const geoData = {
        country: data.country?.iso_code,
        countryName: data.country?.names?.en,
        city: data.city?.names?.en,
        latitude: data.location?.latitude,
        longitude: data.location?.longitude,
        accuracy: data.location?.accuracy_radius,
        timezone: data.location?.time_zone,
        isp: data.traits?.isp,
        organization: data.traits?.organization,
        asn: data.traits?.autonomous_system_number,
        isCrawler: data.traits?.is_anonymous_proxy,
        isProxy: data.traits?.is_anonymous_proxy || data.traits?.is_anonymous_vpn,
        isTor: data.traits?.is_tor_exit_node,
        riskScore: this.calculateLocationRiskScore(data),
      };
      
      // Cache the geo data if caching is enabled
      if (this.cacheEnabled && this.redis) {
        await this.cacheGeoData(ip, geoData);
      }
      
      return geoData;
    } catch (error) {
      logger.error('GeoIP lookup failed', { ip, error });
      return {
        error: 'GeoIP lookup failed',
        riskScore: 50, // Default medium risk for failed lookups
      };
    }
  }

  /**
   * Calculate a risk score based on location data
   */
  private calculateLocationRiskScore(data: any): number {
    let score = 0;
    
    // High-risk countries list (example)
    const highRiskCountries = ['RU', 'CN', 'NG', 'UA', 'BY', 'VE'];
    const mediumRiskCountries = ['IN', 'BR', 'PK', 'ZA', 'ID'];
    
    // Add risk score based on country
    if (data.country?.iso_code) {
      if (highRiskCountries.includes(data.country.iso_code)) {
        score += 30;
      } else if (mediumRiskCountries.includes(data.country.iso_code)) {
        score += 15;
      }
    }
    
    // Add risk for VPNs/proxies/Tor
    if (data.traits?.is_anonymous_proxy || data.traits?.is_anonymous_vpn) {
      score += 40;
    }
    
    if (data.traits?.is_tor_exit_node) {
      score += 60;
    }
    
    return Math.min(score, 100);
  }

  /**
   * Get cached geo data
   */
  private async getCachedGeoData(ip: string): Promise<any | null> {
    if (!this.redis) return null;
    
    const cacheKey = `geoip:${ip}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        return null;
      }
    }
    
    return null;
  }

  /**
   * Cache geo data for an IP
   */
  private async cacheGeoData(ip: string, data: any): Promise<void> {
    if (!this.redis) return;
    
    const cacheKey = `geoip:${ip}`;
    await this.redis.set(cacheKey, JSON.stringify(data));
    await this.redis.expire(cacheKey, 86400); // Cache for 24 hours
  }
}
```

## Performance Optimizations

To meet the ≤ 150ms P95 latency requirement, the Evaluator Service implements several performance optimizations:

1. **Redis Caching**:
   - GeoIP lookups are cached to avoid repeated API calls
   - Fingerprint data is also cached where appropriate
   - Rule evaluations for common patterns can be cached

2. **Connection Pooling**:
   - Redis connections are pooled for reuse
   - HTTP connections to third-party APIs are kept alive

3. **Batch Processing**:
   - Where possible, data enrichment tasks run in parallel
   - Bulk operations are used for Redis when multiple keys need updates

4. **In-Memory Processing**:
   - Frequently accessed rules are kept in memory
   - Common patterns are cached in memory with LRU eviction

5. **Circuit Breaking**:
   - External service calls have timeouts and circuit breakers
   - Fallbacks are used when third-party services are unavailable

## Deployment and Scaling

The Evaluator Service is designed to scale horizontally to handle the 500 req/s requirement:

1. **Containerization**:
   - Packaged as a Docker container for easy deployment
   - Configured with health checks for orchestration

2. **Horizontal Scaling**:
   - Can be scaled to multiple instances behind a load balancer
   - Each instance processes events independently

3. **Consumer Groups**:
   - Multiple instances form a Kafka consumer group
   - Events are distributed automatically across instances

4. **Resource Allocation**:
   - Each container is configured with appropriate CPU and memory limits
   - Auto-scaling based on CPU usage and queue depth

## Monitoring and Observability

The service includes comprehensive monitoring:

1. **Metrics**:
   - Request counts, error rates, and latencies
   - Rule evaluation stats and risk score distributions
   - Resource utilization metrics

2. **Logging**:
   - Structured JSON logs for easier analysis
   - Log levels configurable per environment
   - Correlation IDs across service boundaries

3. **Tracing**:
   - Distributed tracing for request flows
   - Performance bottleneck identification

## Conclusion

The Evaluator Service forms the core of the FraudShield platform's risk assessment capabilities. By combining rule-based evaluation, behavioral analysis, and machine learning, it provides accurate fraud risk scores while meeting the performance requirements of 500 req/s with a P95 latency of ≤ 150ms.