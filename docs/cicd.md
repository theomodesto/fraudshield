# CI/CD Setup for FraudShield

This document explains the Continuous Integration and Continuous Deployment pipelines set up for the FraudShield platform.

## Overview

FraudShield uses GitHub Actions for CI/CD, with separate workflows for:

1. Continuous Integration (testing, linting, building)
2. Deployment of individual services (Evaluator, Decisioner, Dashboard)

The CI/CD pipeline leverages Turborepo's pipeline and filtering capabilities for efficient builds.

## CI Workflow

The CI workflow runs on every push to the main branch and on pull requests. It consists of three jobs:

- **Lint**: Validates code quality using ESLint
- **Test**: Runs tests across all packages and applications
- **Build**: Ensures that all packages and applications build correctly

The CI workflow can be run manually using:

```bash
yarnci
```

## Deployment Workflows

### Evaluator Service

Deployed to AWS ECS when changes are pushed to the main branch that affect the evaluator service or its dependencies.

The deployment process:
1. Builds the service using Turborepo's filtering
2. Creates a Docker image
3. Pushes the image to Amazon ECR
4. Updates the ECS service

To run manually:
```bash
yarndeploy:evaluator
```

### Decisioner Service

Deployed to AWS ECS when changes are pushed to the main branch that affect the decisioner service or its dependencies.

The deployment process:
1. Builds the service using Turborepo's filtering
2. Creates a Docker image
3. Pushes the image to Amazon ECR
4. Updates the ECS service

To run manually:
```bash
yarndeploy:decisioner
```

### Dashboard Application

Deployed to Vercel when changes are pushed to the main branch that affect the dashboard application or its dependencies.

The deployment process:
1. Builds the application using Turborepo's filtering
2. Deploys the built application to Vercel

To run manually:
```bash
yarndeploy:dashboard
```

## Secrets

The following secrets need to be configured in GitHub:

### AWS Deployment
- `AWS_ACCESS_KEY_ID`: AWS access key for deployment
- `AWS_SECRET_ACCESS_KEY`: AWS secret key for deployment
- `AWS_REGION`: AWS region for deployment
- `ECS_CLUSTER`: The name of the ECS cluster

### Vercel Deployment
- `VERCEL_TOKEN`: API token for Vercel
- `VERCEL_ORG_ID`: Vercel organization ID
- `VERCEL_PROJECT_ID`: Vercel project ID
- `DASHBOARD_API_URL`: The API base URL for the dashboard

## Local Development

For local development, you can use Docker Compose:

```bash
docker-compose up
```

This will start all the required services locally including:
- Redpanda (Kafka API compatible)
- Redis
- PostgreSQL
- MinIO (S3 compatible)

## Troubleshooting

If you encounter issues with the CI/CD pipelines:

1. Check the GitHub Actions logs for detailed error messages
2. Verify that all required secrets are configured
3. Ensure your code passes all lint and test checks locally before pushing
4. For Docker build issues, try building locally with `docker build -f apps/[service]/Dockerfile .` 