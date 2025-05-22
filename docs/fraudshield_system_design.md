# FraudShield System Architecture Design

## Implementation Approach

After analyzing the requirements for the FraudShield fraud detection platform, we've identified the following key implementation challenges and solutions:

### Key Challenges

1. **Ultra-low Latency Requirements**: The system must respond within 150ms (P95) from SDK call to risk score response while performing complex fraud analysis.

2. **Real-time Data Processing**: The system must process and enrich transaction data in real-time, including device fingerprinting, GeoIP lookups, and velocity checks.

3. **High Scalability**: The architecture must handle 500 requests per second with horizontal scaling capabilities.

4. **Privacy and Compliance**: The system needs to be GDPR-compliant with IP anonymization features while still providing effective fraud detection.

5. **Multi-platform Integration**: The solution requires seamless integration with both Shopify and WooCommerce platforms with minimal merchant effort.

### Implementation Strategy

To address these challenges, we'll implement an event-driven microservices architecture using the following open-source frameworks and technologies:

1. **Backend Services**: Node.js with TypeScript and Fastify for high-performance API servers
   - Fastify is chosen over Express for its superior performance (~3-5x faster) and built-in JSON schema validation
   - TypeScript ensures type safety and improved developer experience

2. **Event Streaming**: Redpanda as a Kafka-compatible event bus
   - Redpanda offers superior performance and simpler operations compared to Apache Kafka
   - Event-driven architecture allows decoupling of services for better scalability

3. **Caching Strategy**: Redis used for hot path data
   - Risk score caching for repeated lookups
   - Visitor behavior patterns for velocity checks
   - Session data for quick fingerprint lookups

4. **Database**: PostgreSQL with optimized schemas
   - Partitioning strategy for transaction data based on merchant and date
   - Efficient indexing for fast lookups
   - JSON columns for flexible schema elements

5. **Third-party Integrations**:
   - Custom Fingerprint Service for device identification
   - hCaptcha Enterprise for bot detection
   - MaxMind GeoIP for location enrichment

6. **Frontend**: React 18 with Vite and Chart.js
   - Client-side rendering for dashboard with optimized bundles
   - Vite for faster development and build times
   - Chart.js for lightweight, responsive visualizations

7. **DevOps**: Docker Compose, Terraform, and AWS
   - Infrastructure-as-Code with Terraform
   - Containerized services with Docker
   - Horizontal pod scaling with AWS ECS/EKS

## System Architecture Overview

### ASCII Architecture Diagram

```
+-------------------+     +-------------------+
| Merchant Website  |     | FraudShield      |
| with SDK          |     | Dashboard        |
+--------+----------+     +---------+---------+
         |                          |
         v                          v
+--------+----------+     +---------+---------+
|                  |     |                   |
| API Gateway /    +<--->+  Dashboard API    |
| Load Balancer    |     |  (Fastify)        |
|                  |     |                   |
+--------+---------+     +---------+-+-------+
         |                         |
         v                         v
+--------+---------+     +---------+---------+
|                  |     |                   |
| Evaluator Service+---->+ Redpanda Topics   |
| (Fastify)        |     | - raw_events      |
|                  |     | - risk_scores     |
+--------+---------+     +---------+-+-------+
         |                         |
         v                         v
+--------+---------+     +---------+---------+
|                  |     |                   |
| Third-party APIs |     | Decisioner Service|
| - Custom Fingerprint |     | (Fastify)        |
| - hCaptcha       |     |                   |
| - GeoIP          |     +------+------+-----+
|                  |            |      |
+------------------+            v      v
                        +-------+--+ +--+------+
                        |          | |         |
                        | Redis    | | Postgres|
                        | Cache    | | Database|
                        |          | |         |
                        +----------+ +---------+
+-------------------+
| Merchant Plugins  |
| - Shopify         |<-----------+
| - WooCommerce     |            |
+-------------------+            |
         |                       |
         v                       |
+--------+----------+            |
| /api/v1/decision  |------------+
+-------------------+
```

## Data Structures and Interfaces

The following section details the core data structures and interfaces used throughout the FraudShield system. These interfaces follow TypeScript conventions and adhere to best practices for object-oriented design.

## Program Call Flow

The sequence diagrams below illustrate the main program flows within the FraudShield system.

## Component Details

### 1. FraudShield SDK

**Purpose**: Lightweight JavaScript SDK that collects browser/device signals and communicates with the backend.

**Key Features**:
- Size under 4KB gzipped
- Custom fingerprinting implementation for device identification
- hCaptcha triggering for suspicious transactions
- Simple one-line initialization

**Implementation Strategy**:
- Pure ES module with no dependencies
- Tree-shakeable design
- Asynchronous loading to avoid blocking page rendering
- Minification and compression for minimal footprint

**Security Considerations**:
- Secure communication over HTTPS
- No sensitive data stored client-side
- Protection against XSS and CSRF attacks

### 2. API Gateway / Load Balancer

**Purpose**: Route incoming traffic to appropriate services and provide rate limiting.

**Implementation Strategy**:
- AWS Application Load Balancer or API Gateway
- Rate limiting to prevent abuse
- TLS termination
- Request routing based on URI paths

### 3. Evaluator Service

**Purpose**: Process incoming events from SDK and determine risk scores.

**Key Features**:
- Consumes SDK events from Redpanda `raw_events` topic
- Enriches with GeoIP, velocity checks, and historical data
- Implements fraud detection algorithms
- Outputs risk scores to `risk_scores` topic

**Implementation Strategy**:
- Fastify server with TypeScript
- Domain-driven design for fraud detection logic
- Efficient third-party API integrations
- Circuit breakers for handling dependencies

### 4. Decisioner Service

**Purpose**: Make final decisions on transactions and expose API for plugins.

**Key Features**:
- Consumes risk scores from Redpanda
- Persists results in PostgreSQL and Redis
- Exposes REST API for transaction decisions
- Implements configurable business rules

**Implementation Strategy**:
- Fastify server with TypeScript
- Optimized caching strategy
- Consistent data handling between Redis and PostgreSQL
- Efficient transaction lookup mechanisms

### 5. Dashboard

**Purpose**: Provide merchants with insights and control over fraud detection.

**Key Features**:
- Display metrics on transactions and fraud
- Allow threshold adjustment
- Visualize fraud patterns
- Support transaction lookup and review

**Implementation Strategy**:
- React 18 with TypeScript
- Vite for build process
- Chart.js for visualizations
- JWT authentication
- Responsive design for various devices

### 6. E-commerce Platform Plugins

**Purpose**: Integrate FraudShield with popular e-commerce platforms.

**Shopify Plugin**:
- Node.js application using Shopify Remix
- Webhook subscriptions for order events
- Automated SDK injection

**WooCommerce Plugin**:
- PHP plugin using WordPress hooks
- Integration with checkout flow
- Automated SDK injection

## API Specifications

### 1. SDK to Backend API

**Endpoint**: `/api/v1/evaluate`

**Method**: POST

**Request Body**:
```json
{
  "sessionId": "string",
  "merchantId": "string",
  "fingerprintData": {
    "visitorId": "string",
    "requestId": "string",
    "incognito": "boolean",
    "browserName": "string",
    "deviceType": "string",
    "os": "string",
    "ipLocation": { /* GeoIP data */ }
  },
  "pageData": {
    "url": "string",
    "referrer": "string"
  },
  "userAction": "string", // checkout, login, etc.
  "timestamp": "number"
}
```

**Response**:
```json
{
  "riskScore": "number", // 0-100
  "isFraud": "boolean",
  "evaluationId": "string",
  "requiresCaptcha": "boolean",
  "captchaSiteKey": "string" // conditional
}
```

### 2. Plugin to Backend API

**Endpoint**: `/api/v1/decision/:orderId`

**Method**: GET

**Parameters**:
- `orderId`: Order identifier in the e-commerce platform

**Response**:
```json
{
  "orderId": "string",
  "riskScore": "number",
  "isFraud": "boolean",
  "recommendation": "string", // "approve", "reject", "review"
  "evaluationId": "string",
  "timestamp": "number"
}
```

### 3. Dashboard APIs

**Authentication Endpoints**:

- `/auth/login` (POST) - Authenticate user and return JWT
- `/auth/refresh` (POST) - Refresh expired JWT

**Configuration Endpoints**:

- `/api/v1/config` (GET, PUT) - Retrieve and update merchant configuration

**Analytics Endpoints**:

- `/api/v1/analytics/summary` (GET) - Get fraud detection summary metrics
- `/api/v1/analytics/trends` (GET) - Get trend data over time periods

**Transaction Endpoints**:

- `/api/v1/transactions` (GET) - List transactions with filtering
- `/api/v1/transactions/:id` (GET) - Get detailed transaction information
- `/api/v1/transactions/:id/review` (PUT) - Update review status

**Rule Management Endpoints**:

- `/api/v1/rules` (GET, POST) - List and create rules
- `/api/v1/rules/:id` (GET, PUT, DELETE) - Manage individual rules

## Database Schema

### PostgreSQL Schema

**1. Merchants Table**
```sql
CREATE TABLE merchants (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  api_key VARCHAR(64) UNIQUE NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  settings JSONB NOT NULL DEFAULT '{}',
  integration_data JSONB NOT NULL DEFAULT '{}'
);
```

**2. Users Table**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(merchant_id, email)
);
```

**3. Transactions Table**
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  order_id VARCHAR(255),
  session_id VARCHAR(255) NOT NULL,
  evaluation_id UUID NOT NULL,
  fingerprint_visitor_id VARCHAR(255),
  risk_score INTEGER NOT NULL,
  is_fraud BOOLEAN NOT NULL,
  risk_factors JSONB,
  page_data JSONB,
  user_action VARCHAR(50),
  geo_data JSONB,
  decision VARCHAR(50),
  review_status VARCHAR(50),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(merchant_id, order_id)
);

-- Partitioning by merchant_id and date for performance
CREATE INDEX idx_transactions_merchant_date ON transactions(merchant_id, created_at);
CREATE INDEX idx_transactions_fingerprint ON transactions(fingerprint_visitor_id);
```

**4. Rules Table**
```sql
CREATE TABLE rules (
  id UUID PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  conditions JSONB NOT NULL,
  action VARCHAR(50) NOT NULL,
  risk_score_adjustment INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**5. Audit Logs Table**
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address VARCHAR(45)
);
```

## Redis Caching Strategy

### Cache Keys and Structure

1. **Risk Score Cache**
   - Key: `risk_score:{merchantId}:{orderId}`
   - Value: JSON string containing risk score data
   - Expiration: 24 hours
   - Purpose: Fast lookup of recent transaction risk scores

2. **Visitor History Cache**
   - Key: `visitor:{merchantId}:{visitorId}`
   - Value: JSON array of recent activity timestamps and actions
   - Expiration: 12 hours
   - Purpose: Velocity checks and pattern recognition

3. **IP Velocity Cache**
   - Key: `ip_velocity:{anonymizedIp}`
   - Value: Counter of recent transactions
   - Expiration: 1 hour
   - Purpose: Detect unusual transaction rates from single IPs

4. **Session Data Cache**
   - Key: `session:{sessionId}`
   - Value: JSON object with session details
   - Expiration: 30 minutes
   - Purpose: Maintain session context between requests

5. **Merchant Settings Cache**
   - Key: `merchant_settings:{merchantId}`
   - Value: JSON object with merchant configuration
   - Expiration: 5 minutes
   - Purpose: Quick access to merchant settings without DB queries

### Caching Strategies

1. **Write-Through Cache**:
   - Update both PostgreSQL and Redis when transaction data changes
   - Ensures consistency between cache and persistent storage

2. **Cache-Aside Pattern**:
   - For merchant settings and configuration data
   - Check cache first, if miss then fetch from DB and populate cache

3. **Time-To-Live (TTL) Strategy**:
   - Different expiration times based on data sensitivity and change frequency
   - Helps maintain GDPR compliance by automatically expiring personal data

4. **Cache Invalidation**:
   - Explicit invalidation when data is updated through dashboard
   - Publish-subscribe model for coordinated cache updates across instances

## Third-Party Service Integration

### Custom Fingerprint Service

**Implementation Approach**:
1. Client-side implementation of browser/device fingerprinting techniques
2. Server-side verification and confidence scoring
3. Multi-signal fingerprinting for high accuracy identification

**Key Methods**:
- Collect multiple device signals (canvas, WebGL, audio, fonts, etc.)
- Generate consistent visitor IDs across sessions
- Cache fingerprint results to improve performance

**Technical Implementation**:
- Pure JavaScript implementation with no external dependencies
- Robust browser compatibility handling
- Privacy-focused approach with no PII collection
- Redis-based caching for performance optimization

### hCaptcha Enterprise Integration

**Implementation Approach**:
1. Invisible challenges for suspicious transactions
2. Risk-based triggering of verification
3. Server-side verification of challenge responses

**Key Methods**:
- Lazy-load hCaptcha script only when needed
- Execute invisible challenges based on risk score threshold
- Fallback mechanisms for accessibility compliance

**Configuration Requirements**:
- Site key and secret key management
- Challenge difficulty configuration
- Customizable appearance settings

### GeoIP Service Integration

**Implementation Approach**:
1. Server-side enrichment of IP addresses using MaxMind GeoIP database
2. Optional IP anonymization for GDPR compliance
3. Caching of GeoIP results for performance

**Key Methods**:
- Periodic database updates
- Efficient lookup implementation
- IP anonymization through configurable masking

**Configuration Requirements**:
- MaxMind license key management
- Database update frequency settings
- IP anonymization toggle and configuration

## Performance Optimization

### Latency Optimization

1. **Connection Pooling**:
   - Maintain connection pools for database and Redis
   - Configure optimal pool sizes based on load testing

2. **Distributed Caching**:
   - Strategic caching of frequently accessed data
   - Redis cluster configuration for high availability

3. **Asynchronous Processing**:
   - Non-blocking I/O operations
   - Event-driven architecture with Redpanda for non-critical processing

4. **Efficient Database Access**:
   - Optimized indexes for common queries
   - Query optimization and monitoring
   - Database connection pooling

5. **Network Optimization**:
   - CDN for static assets
   - Regional deployment for reduced network latency
   - HTTP/2 for reduced connection overhead

### Scalability Strategy

1. **Horizontal Scaling**:
   - Stateless services for easy horizontal scaling
   - Kubernetes/ECS deployment with auto-scaling rules

2. **Database Scaling**:
   - Read replicas for read-heavy operations
   - Table partitioning for large datasets
   - Connection pooling to handle increased connections

3. **Load Balancing**:
   - Distribution of incoming requests across multiple instances
   - Health checks for automatic instance replacement

4. **Capacity Planning**:
   - Regular load testing to determine scaling thresholds
   - Monitoring and alerting for resource utilization

## Security Considerations

### Authentication and Authorization

1. **JWT Authentication**:
   - Short-lived access tokens (15 minutes)
   - Refresh token mechanism with secure storage
   - Token revocation capabilities

2. **API Keys**:
   - Secure generation and storage
   - Rate limiting and usage monitoring
   - Key rotation capabilities

3. **Role-Based Access Control**:
   - Granular permissions for dashboard users
   - Audit logging for sensitive operations

### Data Protection

1. **Encryption**:
   - TLS for all data in transit
   - Sensitive data encryption at rest
   - Database-level encryption

2. **Privacy Controls**:
   - IP anonymization toggle for GDPR compliance
   - Data minimization principles
   - Configurable data retention policies

3. **Input Validation**:
   - Schema validation for all API inputs
   - Parameterized queries to prevent injection attacks
   - Output encoding to prevent XSS

## Anything Unclear

1. **Machine Learning Implementation**: The PRD doesn't specify if machine learning should be part of the initial implementation. We've designed the architecture to support ML integration in the future, but clarification would help determine if we need ML models in the first release.

2. **Custom Rules Definition**: While the dashboard allows for rules configuration, the specific rule format and complexity need further clarification. We've designed a flexible rule engine, but specific business rules may require additional implementation.

3. **Merchant Onboarding Flow**: The technical requirements don't fully address the merchant onboarding process. Additional details would help ensure a smooth setup experience.

4. **Historical Data Import**: For merchants switching from other fraud systems, an import mechanism might be necessary. The current design doesn't include this functionality explicitly.

5. **Internationalization Requirements**: While GDPR compliance is mentioned, specific internationalization requirements for the dashboard and communication are not detailed.