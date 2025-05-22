-- FraudShield Database Migration Scripts

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Schema
CREATE SCHEMA IF NOT EXISTS fraudshield;

-- Set search path
SET search_path TO fraudshield, public;

-- 1. Merchants Table
CREATE TABLE merchants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  api_key VARCHAR(64) UNIQUE NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  settings JSONB NOT NULL DEFAULT '{
    "riskThreshold": 70,
    "enableCaptcha": true,
    "captchaThreshold": 80,
    "ipAnonymization": false
  }',
  integration_data JSONB NOT NULL DEFAULT '{}'
);

-- 2. Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
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

-- 3. Rules Table
CREATE TABLE rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- 4. Transactions Table
-- Creating a partitioned table for better performance
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  review_status VARCHAR(50) DEFAULT 'pending',
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(merchant_id, order_id)
) PARTITION BY RANGE (created_at);

-- Create monthly partitions for transaction data
CREATE TABLE transactions_y2025m01 PARTITION OF transactions
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE transactions_y2025m02 PARTITION OF transactions
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

CREATE TABLE transactions_y2025m03 PARTITION OF transactions
  FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

CREATE TABLE transactions_y2025m04 PARTITION OF transactions
  FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');

CREATE TABLE transactions_y2025m05 PARTITION OF transactions
  FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');

CREATE TABLE transactions_y2025m06 PARTITION OF transactions
  FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');

-- 5. Audit Logs Table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address VARCHAR(45)
);

-- 6. API Keys Table
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- 7. Sessions Table for JWT refresh tokens
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash VARCHAR(255) NOT NULL,
  user_agent TEXT,
  ip_address VARCHAR(45),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
-- Merchant indexes
CREATE INDEX idx_merchants_api_key ON merchants(api_key);

-- User indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_merchant ON users(merchant_id);

-- Transaction indexes
CREATE INDEX idx_transactions_merchant_date ON transactions(merchant_id, created_at);
CREATE INDEX idx_transactions_fingerprint ON transactions(fingerprint_visitor_id);
CREATE INDEX idx_transactions_order_id ON transactions(order_id);
CREATE INDEX idx_transactions_session_id ON transactions(session_id);

-- Rules indexes
CREATE INDEX idx_rules_merchant ON rules(merchant_id);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_merchant ON audit_logs(merchant_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- API keys indexes
CREATE INDEX idx_api_keys_merchant ON api_keys(merchant_id);

-- Sessions indexes
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token_hash);

-- Functions
-- Automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now(); 
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
-- Auto-update updated_at field
CREATE TRIGGER update_merchants_timestamp 
  BEFORE UPDATE ON merchants 
  FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER update_users_timestamp 
  BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER update_rules_timestamp 
  BEFORE UPDATE ON rules 
  FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER update_transactions_timestamp 
  BEFORE UPDATE ON transactions 
  FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

-- Sample data for testing
-- Create test merchant
INSERT INTO merchants (name, api_key) VALUES 
  ('Test Merchant', 'test_api_key_12345678901234567890123456789012');

-- Create admin user for test merchant
INSERT INTO users (merchant_id, email, password_hash, first_name, last_name, role) VALUES 
  ((SELECT id FROM merchants WHERE name = 'Test Merchant'), 
   'admin@testmerchant.com', 
   '$2a$10$hACwQ5/HQI6FhbIISOUVeusy3sKyUDhSq36fF5d/54aULe9WVODCO', -- bcrypt hash for 'password'
   'Admin',
   'User',
   'admin');
   
-- Create sample rules
INSERT INTO rules (merchant_id, name, description, conditions, action, risk_score_adjustment, is_active) VALUES
  ((SELECT id FROM merchants WHERE name = 'Test Merchant'),
   'High Risk Country',
   'Flag transactions from high-risk countries',
   '{"conditions": [{"field": "geo_data.country", "operator": "in", "value": ["RU", "NG", "BR"]}]}',
   'flag',
   30,
   true);

INSERT INTO rules (merchant_id, name, description, conditions, action, risk_score_adjustment, is_active) VALUES
  ((SELECT id FROM merchants WHERE name = 'Test Merchant'),
   'Suspicious Device',
   'Block transactions from devices with suspicious characteristics',
   '{"conditions": [{"field": "fingerprintData.incognito", "operator": "eq", "value": true}]}',
   'block',
   50,
   true);

-- Create partition management function
CREATE OR REPLACE FUNCTION create_transaction_partition()
RETURNS void AS $$
DECLARE
  next_month DATE;
  partition_name TEXT;
  start_date TEXT;
  end_date TEXT;
BEGIN
  -- Calculate the next month we need a partition for
  next_month := date_trunc('month', now()) + interval '2 month';
  
  -- Create partition name
  partition_name := 'transactions_y' || to_char(next_month, 'YYYY') || 'm' || to_char(next_month, 'MM');
  
  -- Calculate start and end dates
  start_date := to_char(next_month, 'YYYY-MM-DD');
  end_date := to_char(next_month + interval '1 month', 'YYYY-MM-DD');
  
  -- Check if partition already exists
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = partition_name) THEN
    -- Create the new partition
    EXECUTE format(
      'CREATE TABLE %I PARTITION OF transactions FOR VALUES FROM (%L) TO (%L)',
      partition_name, start_date, end_date
    );
    
    RAISE NOTICE 'Created new partition %', partition_name;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Setup a monthly job to create new partitions
COMMENT ON FUNCTION create_transaction_partition() IS 'Run monthly to create new transaction table partitions';
