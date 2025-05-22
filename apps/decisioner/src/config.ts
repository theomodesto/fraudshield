import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

interface Config {
  port: number;
  host: string;
  environment: string;
  logLevel: string;
  
  kafka: {
    brokers: string[];
    clientId: string;
    groupId: string;
    riskScoresTopic: string;
    transactionDecisionsTopic: string;
    consumerPollInterval: number;
  };
  
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  
  api: {
    rateLimit: {
      max: number;
      timeWindow: string;
    };
  };

  rules: {
    defaultRiskThreshold: number;
    highRiskThreshold: number;
  };
}

// Default configuration
const config: Config = {
  port: parseInt(process.env.DECISIONER_PORT || '3100', 10),
  host: process.env.HOST || 'localhost',
  environment: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'fraudshield-decisioner',
    groupId: process.env.KAFKA_GROUP_ID || 'fraudshield-decisioners',
    riskScoresTopic: process.env.KAFKA_RISK_SCORES_TOPIC || 'risk_scores',
    transactionDecisionsTopic: process.env.KAFKA_TRANSACTION_DECISIONS_TOPIC || 'transaction_decisions',
    consumerPollInterval: parseInt(process.env.KAFKA_CONSUMER_POLL_INTERVAL || '100', 10),
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6380', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '1', 10), // Use a different db than evaluator
  },
  
  api: {
    rateLimit: {
      max: parseInt(process.env.API_RATE_LIMIT_MAX || '100', 10),
      timeWindow: process.env.API_RATE_LIMIT_WINDOW || '1 minute',
    },
  },

  rules: {
    defaultRiskThreshold: parseFloat(process.env.DEFAULT_RISK_THRESHOLD || '0.7'),
    highRiskThreshold: parseFloat(process.env.HIGH_RISK_THRESHOLD || '0.9'),
  },
};

export default config; 