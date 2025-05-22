# FraudShield Decisioner

Decision engine for the FraudShield platform that processes and evaluates transactions for potential fraud.

## Overview

The Decisioner service is responsible for:
- Processing incoming transaction data
- Applying fraud detection rules and models
- Making real-time decisions on transaction validity
- Publishing results to Kafka for further processing

## Technology Stack

- Node.js
- TypeScript
- Fastify (API server)
- Kafka (Message streaming)
- Redis (Caching)

## Getting Started

### Prerequisites

- Node.js 18+ 
- Redis
- Kafka

### Installation

```bash
# Install dependencies
yarn install

# Build the project
yarn build
```

### Running the Service

```bash
# Development mode
yarn dev

# Run Kafka consumer in development
yarn dev:consumer

# Production mode
yarn build
yarn start
```

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Server
PORT=3100
HOST=0.0.0.0
NODE_ENV=development

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_GROUP_ID=decisioner-group
KAFKA_CONSUMER_TOPIC=transactions
KAFKA_PRODUCER_TOPIC=decisions

# Redis
REDIS_HOST=localhost
REDIS_PORT=6380
```

## Testing

```bash
# Run tests
yarn test

# Run tests with watch mode
yarn test:watch

# Run tests with coverage
yarn test:coverage
```

## Docker Support

A Dockerfile is included for containerization:

```bash
# Build the Docker image
docker build -t fraudshield-decisioner .

# Run the container
docker run -p 3001:3001 fraudshield-decisioner
``` 