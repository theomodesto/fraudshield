# FraudShield Evaluator

Evaluation service for the FraudShield platform that collects and analyzes transaction data to improve fraud detection.

## Overview

The Evaluator service is responsible for:
- Storing transaction and decision data in a PostgreSQL database
- Analyzing transaction patterns for potential fraud indicators
- Generating reports and insights on fraud detection effectiveness
- Providing APIs for querying transaction history and statistics

## Technology Stack

- Node.js
- TypeScript
- Fastify (API server)
- PostgreSQL (Database)
- Kysely (SQL query builder)
- Redis (Caching)
- Axios (HTTP client)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis

### Installation

```bash
# Install dependencies
yarn install

# Build the project
yarn run build
```

### Database Setup

The service uses Kysely for database migrations:

```bash
# Run migrations
yarn run migrate:up

# Rollback migrations
yarn run migrate:down

# Create a new migration
yarn run migrate:create my_migration_name

# List migrations
yarn run migrate:list
```

### Running the Service

```bash
# Development mode
yarn run dev

# Production mode
yarn run build
yarn start
```

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Server
PORT=3200
HOST=0.0.0.0
NODE_ENV=development

# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5433
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=fraudshield

# Redis
REDIS_HOST=localhost
REDIS_PORT=6380

# MaxMind GeoIP (optional)
MAXMIND_LICENSE_KEY=your_license_key
```

## Testing

```bash
# Run tests
yarn test
```

## Docker Support

A Dockerfile is included for containerization:

```bash
# Build the Docker image
docker build -t fraudshield-evaluator .

# Run the container
docker run -p 3002:3002 fraudshield-evaluator
``` 