# FraudShield Deployment Guide

## Overview

This document provides instructions for deploying the FraudShield fraud detection platform in a production environment. It covers the deployment of all core components, integration points, and provides recommendations for monitoring and maintenance.

## System Components

The FraudShield platform consists of the following core components:

1. **Evaluator Service**: Processes raw events and calculates risk scores
2. **Decisioner Service**: Makes final fraud decisions based on risk scores
3. **Dashboard API**: Backend API for the merchant dashboard
4. **Dashboard UI**: React-based frontend for the merchant dashboard
5. **JavaScript SDK**: Client-side library for data collection

## Infrastructure Requirements

### Recommended AWS Resources

| Resource | Type | Quantity | Purpose |
|----------|------|----------|----------|
| EC2 or ECS | Container hosts | Min. 3 per service | Running service containers |
| RDS PostgreSQL | db.r6g.large | 1 (Multi-AZ) | Primary database |
| ElastiCache Redis | cache.r6g.large | Cluster with 3 nodes | Caching and velocity checks |
| Amazon MSK | kafka.m5.large | 3 brokers | Event streaming |
| Application Load Balancer | Standard | 1 | Traffic distribution |
| CloudFront | Standard | 1 | CDN for static assets |
| S3 | Standard | 1 bucket | Static assets |

### Resource Sizing

For handling 500 req/s with <150ms P95 latency:

* **Evaluator Service**: Minimum 6 containers (2 per AZ), each with 2 vCPU and 4GB RAM
* **Decisioner Service**: Minimum 3 containers (1 per AZ), each with 2 vCPU and 4GB RAM
* **Dashboard API**: Minimum 3 containers (1 per AZ), each with 1 vCPU and 2GB RAM
* **Redis Cache**: 3-node cluster with 8GB memory per node
* **PostgreSQL**: db.r6g.large with Multi-AZ deployment

## Deployment Process

### 1. Infrastructure Provisioning

Use the provided Terraform scripts to provision the infrastructure:

```bash
# Initialize Terraform
cd terraform
terraform init

# Plan deployment
terraform plan -var-file=production.tfvars -out=tfplan

# Apply deployment
terraform apply tfplan
```

### 2. Database Initialization

```bash
# Apply database migrations
psql -h <DB_HOST> -U <DB_USER> -d fraudshield -f docs/fraudshield_db_migrations.sql

# Verify migration success
psql -h <DB_HOST> -U <DB_USER> -d fraudshield -c "SELECT COUNT(*) FROM fraudshield.merchants;"
```

### 3. Container Deployment

#### Build and Push Containers

```bash
# Build containers
docker-compose -f docker-compose.build.yml build

# Tag images
docker tag fraudshield-evaluator:latest <ECR_REPO>/fraudshield-evaluator:v1.0.0
docker tag fraudshield-decisioner:latest <ECR_REPO>/fraudshield-decisioner:v1.0.0
docker tag fraudshield-dashboard-api:latest <ECR_REPO>/fraudshield-dashboard-api:v1.0.0

# Push to container registry
docker push <ECR_REPO>/fraudshield-evaluator:v1.0.0
docker push <ECR_REPO>/fraudshield-decisioner:v1.0.0
docker push <ECR_REPO>/fraudshield-dashboard-api:v1.0.0
```

#### Deploy Services

```bash
# Deploy with Helm
helm upgrade --install fraudshield-evaluator ./helm/evaluator \
  --namespace fraudshield \
  --set image.repository=<ECR_REPO>/fraudshield-evaluator \
  --set image.tag=v1.0.0 \
  --values ./helm/evaluator/values-production.yaml

helm upgrade --install fraudshield-decisioner ./helm/decisioner \
  --namespace fraudshield \
  --set image.repository=<ECR_REPO>/fraudshield-decisioner \
  --set image.tag=v1.0.0 \
  --values ./helm/decisioner/values-production.yaml

helm upgrade --install fraudshield-dashboard-api ./helm/dashboard-api \
  --namespace fraudshield \
  --set image.repository=<ECR_REPO>/fraudshield-dashboard-api \
  --set image.tag=v1.0.0 \
  --values ./helm/dashboard-api/values-production.yaml
```

### 4. Frontend Deployment

```bash
# Build frontend
cd dashboard
yarnbuild

# Deploy to S3
aws s3 sync build/ s3://fraudshield-dashboard/

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id <CF_DISTRIBUTION_ID> --paths "/*"
```

### 5. SDK Deployment

```bash
# Build SDK
cd sdk
yarnbuild

# Deploy to S3
aws s3 sync dist/ s3://fraudshield-sdk/

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id <SDK_CF_DISTRIBUTION_ID> --paths "/*"
```

## Configuration

### Environment Variables

Each service requires specific environment variables to be set:

### Evaluator Service

```
# Required
REDPANDA_BROKERS=redpanda:9092
KAFKA_RAW_EVENTS_TOPIC=raw_events
KAFKA_RISK_SCORES_TOPIC=risk_scores
REDIS_URL=redis://redis:6379
GEOIP_API_KEY=your_maxmind_key

# Optional
PORT=3001
LOG_LEVEL=info
METRICS_ENABLED=true
CACHE_ENABLED=true
IP_ANONYMIZATION=true
ENABLE_RULES=true
ENABLE_VELOCITY=true
ENABLE_ML_MODEL=false  # Set to true if ML model is available
CAPTCHA_SITE_KEY=your_hcaptcha_site_key
CAPTCHA_SECRET_KEY=your_hcaptcha_secret_key
FINGERPRINT_CACHE_TTL=2592000  # 30 days in seconds
```

### Decisioner Service

```
# Required
REDPANDA_BROKERS=redpanda:9092
KAFKA_RISK_SCORES_TOPIC=risk_scores
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=fraudshield
POSTGRES_USER=app
POSTGRES_PASSWORD=your_db_password
REDIS_URL=redis://redis:6379

# Optional
PORT=3002
LOG_LEVEL=info
METRICS_ENABLED=true
CACHE_TTL=86400
```

### Dashboard API

```
# Required
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=fraudshield
POSTGRES_USER=app
POSTGRES_PASSWORD=your_db_password
REDIS_URL=redis://redis:6379
JWT_SECRET=your_jwt_secret
JWT_EXPIRATION=900  # 15 minutes in seconds
REFRESH_TOKEN_EXPIRATION=2592000  # 30 days in seconds

# Optional
PORT=3003
LOG_LEVEL=info
METRICS_ENABLED=true
CORS_ORIGIN=https://dashboard.fraudshield.io
```

## Third-Party Services Setup

### MaxMind GeoIP

1. Create a MaxMind account at [maxmind.com](https://www.maxmind.com/)
2. Generate an API key for the GeoIP2 Precision service
3. Set the `GEOIP_API_KEY` environment variable with your API key

### hCaptcha Enterprise

1. Create a hCaptcha account at [hcaptcha.com](https://www.hcaptcha.com/)
2. Set up a site and get your site key and secret key
3. Set the `CAPTCHA_SITE_KEY` and `CAPTCHA_SECRET_KEY` environment variables

### Custom Fingerprint Service

The custom fingerprint service is built into the SDK and Evaluator Service, with no external dependencies. Configuration options include:

1. `FINGERPRINT_CACHE_TTL`: Time in seconds to cache fingerprint data (default: 30 days)
2. On the client side, you can configure signal collection via the SDK options

## Backup and Disaster Recovery

### Database Backup Strategy

1. **Daily Automated Backups**: Configure RDS to perform daily automated backups with 30-day retention
2. **Point-in-Time Recovery**: Enable point-in-time recovery for the RDS instance
3. **Manual Snapshots**: Take manual snapshots before major changes or updates

### Data Retention

- **Transaction Data**: 2 years (compressed after 90 days)
- **Audit Logs**: 1 year
- **Event Logs**: 30 days

### Recovery Procedures

1. **Database Failure**:
   - RDS will automatically fail over to the standby instance in Multi-AZ deployment
   - Monitor for failover events and validate application functionality

2. **Service Failure**:
   - ECS will automatically restart failed tasks
   - If an entire service is down, redeploy using the latest stable image

3. **Complete Region Failure**:
   - Provision infrastructure in backup region using Terraform
   - Restore database from the latest snapshot
   - Update DNS to point to the new region

## Monitoring and Alerts

### Key Metrics to Monitor

| Metric | Description | Alert Threshold |
|--------|-------------|----------------|
| API Response Time | P95 latency for API calls | > 150ms |
| Event Processing Time | Time to process a single event | > 200ms |
| Error Rate | Percentage of requests resulting in errors | > 1% |
| Queue Depth | Number of events waiting to be processed | > 1000 events |
| Database Connections | Number of active database connections | > 80% of max |
| Cache Hit Rate | Percentage of cache hits | < 80% |

### Logging

All services are configured to output structured JSON logs that include:

- Timestamp
- Log level
- Service name
- Correlation ID
- Message
- Additional context

Logs are collected by CloudWatch Logs and can be analyzed using CloudWatch Logs Insights or exported to a third-party log management solution.

### Alert Configuration

Set up the following alerts using CloudWatch Alarms:

1. **Service Health**:
   - Task health in ECS
   - API endpoint availability
   - Database connectivity

2. **Performance**:
   - P95 latency exceeding 150ms
   - Processing time exceeding 200ms
   - Queue depth exceeding 1000 events

3. **Errors**:
   - Error rate exceeding 1%
   - Failed webhook deliveries
   - Database transaction failures

## SSL and Security

### SSL Certificates

1. **API Endpoints**: Use AWS Certificate Manager to provision and manage certificates
2. **CloudFront Distributions**: Use AWS Certificate Manager for CloudFront certificates

### Network Security

1. **VPC Configuration**:
   - Private subnets for all services
   - Public subnets only for load balancers
   - Security groups to restrict traffic flow

2. **API Security**:
   - Rate limiting using AWS WAF
   - CORS restrictions
   - Input validation
   - Authentication for all dashboard API endpoints

### Data Security

1. **Encryption at Rest**:
   - RDS encryption using AWS KMS
   - S3 bucket encryption
   - ElastiCache at-rest encryption

2. **Encryption in Transit**:
   - HTTPS for all external endpoints
   - TLS for internal service communication

3. **Sensitive Data Handling**:
   - IP anonymization option for GDPR compliance
   - PII handling according to data protection requirements

## Integration Testing

After deployment, validate the system with the following integration tests:

1. **SDK Integration**:
   - Install SDK on test website
   - Verify events are being received
   - Check risk scores are being calculated correctly

2. **Decision API**:
   - Verify decisions can be retrieved for orders
   - Test with various risk scenarios

3. **Webhook Delivery**:
   - Set up a test webhook endpoint
   - Verify webhook delivery and signature validation

4. **Dashboard Functionality**:
   - Log in to dashboard
   - Review transactions
   - Modify settings
   - Create and test rules

## Scaling Considerations

### Horizontal Scaling

The system is designed to scale horizontally to handle increased load:

1. **Service Containers**:
   - Configure auto-scaling based on CPU utilization (target 70%)
   - Add more instances during peak traffic periods

2. **Database**:
   - Increase read capacity with read replicas
   - Consider vertical scaling for the primary instance if write load increases

3. **Cache**:
   - Add more Redis nodes as cache utilization increases
   - Adjust eviction policies based on hit/miss patterns

### Performance Tuning

1. **Database**:
   - Regularly analyze slow queries
   - Optimize indexes based on query patterns
   - Consider query caching for frequently accessed data

2. **API Endpoints**:
   - Implement response caching where appropriate
   - Optimize request/response payload sizes
   - Use compression for larger payloads

3. **Event Processing**:
   - Tune consumer group configuration for optimal throughput
   - Adjust batch sizes based on performance testing
   - Consider partitioning strategy for event topics

## Conclusion

This deployment guide provides comprehensive instructions for setting up the FraudShield platform in a production environment. Following these guidelines will ensure a secure, performant, and reliable fraud detection system that meets the specified requirements of 500 req/s with P95 latency ≤ 150ms.