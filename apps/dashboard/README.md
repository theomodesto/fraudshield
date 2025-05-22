# FraudShield Dashboard

Web-based dashboard for visualizing and managing fraud detection data in the FraudShield platform.

## Overview

The Dashboard provides a user interface for:
- Visualizing fraud detection metrics and trends
- Viewing transaction history and decision outcomes
- Analyzing fraud patterns with interactive charts
- Managing fraud detection rules and settings

## Technology Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Chart.js
- React Query
- Axios

## Getting Started

### Prerequisites

- Node.js 18+
- Access to FraudShield API services (Decisioner and Evaluator)

### Installation

```bash
# Install dependencies
yarn install
```

### Running the Dashboard

```bash
# Development mode
yarn dev

# Build for production
yarn build

# Start production server
yarn start
```

The dashboard will be available at http://localhost:3000

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```
# API Services
NEXT_PUBLIC_API_BASE_URL=http://localhost:3002
NEXT_PUBLIC_DECISIONER_URL=http://localhost:3001

# Authentication (if applicable)
NEXT_PUBLIC_AUTH_ENABLED=false
```

## Features

- Real-time fraud detection metrics dashboard
- Transaction history and search
- Fraud pattern visualization
- Rule management interface
- User authentication and authorization

## Development

```bash
# Run linting
yarn lint
```

## Deployment

The dashboard can be deployed to any hosting service that supports Next.js applications, such as Vercel, Netlify, or a custom server.

```bash
# Build for production
yarn build

# Export static site (if needed)
npx next export
``` 