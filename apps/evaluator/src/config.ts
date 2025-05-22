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
    rawEventsTopic: string;
    riskScoresTopic: string;
  };
  
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  
  postgres: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    schema: string;
    ssl: boolean;
    maxConnections: number;
    idleTimeoutMillis: number;
  };
  
  geoip: {
    dbPath: string;
    updateInterval: number;
  };
  
  hcaptcha: {
    siteKey: string;
    secretKey: string;
  };
  
  api: {
    rateLimit: {
      max: number;
      timeWindow: string;
    };
  };
}

// Default configuration
const config: Config = {
  port: parseInt(process.env.PORT || '3200', 10),
  host: process.env.HOST || 'localhost',
  environment: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5433', 10),
    user: process.env.POSTGRES_USER || 'fraudshield',
    password: process.env.POSTGRES_PASSWORD || 'fraudshield_password',
    database: process.env.POSTGRES_DB || 'fraudshield',
    schema: process.env.POSTGRES_SCHEMA || 'fraudshield',
    ssl: process.env.POSTGRES_SSL === 'true',
    maxConnections: parseInt(process.env.POSTGRES_MAX_CONNECTIONS || '10', 10),
    idleTimeoutMillis: parseInt(process.env.POSTGRES_IDLE_TIMEOUT || '30000', 10),
  },

  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'fraudshield-evaluator',
    rawEventsTopic: process.env.KAFKA_RAW_EVENTS_TOPIC || 'raw_events',
    riskScoresTopic: process.env.KAFKA_RISK_SCORES_TOPIC || 'risk_scores',
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  
  
  geoip: {
    dbPath: process.env.GEOIP_DB_PATH || './data/GeoLite2-City.mmdb',
    updateInterval: parseInt(process.env.GEOIP_UPDATE_INTERVAL || '86400000', 10), // 24 hours
  },
  
  hcaptcha: {
    siteKey: process.env.HCAPTCHA_SITE_KEY || '10000000-ffff-ffff-ffff-000000000001',
    secretKey: process.env.HCAPTCHA_SECRET_KEY || '0x0000000000000000000000000000000000000000',
  },
  
  api: {
    rateLimit: {
      max: parseInt(process.env.API_RATE_LIMIT_MAX || '100', 10),
      timeWindow: process.env.API_RATE_LIMIT_WINDOW || '1 minute',
    },
  },
};

export default config; 