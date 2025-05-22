'use client'

import { useState } from 'react'
import type { FraudShield, SDKConfig } from '@fraudshield/sdk'

interface SdkInitializerProps {
  onInitialized: (instance: FraudShield) => void
}

export default function SdkInitializer({ onInitialized }: SdkInitializerProps) {
  const [merchantId, setMerchantId] = useState('test-merchant-id')
  const [apiEndpoint, setApiEndpoint] = useState('http://127.0.0.1:3200')
  const [enableCaptcha, setEnableCaptcha] = useState(true)
  const [debug, setDebug] = useState(true)
  const [testMode, setTestMode] = useState(true)
  const [simulateRiskScore, setSimulateRiskScore] = useState<number | undefined>(undefined)
  const [simulateFraud, setSimulateFraud] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleInitialize = () => {
    try {
      setError(null)
      
      // Import the SDK dynamically to avoid SSR issues
      import('@fraudshield/sdk').then(({ FraudShield }) => {
        const config: SDKConfig = {
          merchantId,
          apiEndpoint,
          enableCaptcha,
          debug,
          testMode,
          simulateRiskScore: simulateRiskScore !== undefined ? Number(simulateRiskScore) : undefined,
          simulateFraud
        }
        
        // Initialize the SDK
        const instance = FraudShield.init(config)
        setIsInitialized(true)
        onInitialized(instance)
      }).catch(err => {
        setError(`Error importing SDK: ${err.message}`)
      })
    } catch (err: any) {
      setError(`Error initializing SDK: ${err.message}`)
    }
  }

  return (
    <div>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mb-4 rounded">
          {error}
        </div>
      )}
      
      <div className="form-group">
        <label className="label" htmlFor="merchantId">Merchant ID</label>
        <input
          id="merchantId"
          className="input"
          type="text"
          value={merchantId}
          onChange={(e) => setMerchantId(e.target.value)}
        />
      </div>
      
      <div className="form-group">
        <label className="label" htmlFor="apiEndpoint">API Endpoint</label>
        <input
          id="apiEndpoint"
          className="input"
          type="text"
          value={apiEndpoint}
          onChange={(e) => setApiEndpoint(e.target.value)}
        />
      </div>
      
      <div className="form-group flex items-center">
        <input
          id="enableCaptcha"
          type="checkbox"
          checked={enableCaptcha}
          onChange={(e) => setEnableCaptcha(e.target.checked)}
          className="mr-2"
        />
        <label htmlFor="enableCaptcha">Enable CAPTCHA</label>
      </div>
      
      <div className="form-group flex items-center">
        <input
          id="debug"
          type="checkbox"
          checked={debug}
          onChange={(e) => setDebug(e.target.checked)}
          className="mr-2"
        />
        <label htmlFor="debug">Debug Mode</label>
      </div>
      
      <div className="form-group flex items-center">
        <input
          id="testMode"
          type="checkbox"
          checked={testMode}
          onChange={(e) => setTestMode(e.target.checked)}
          className="mr-2"
        />
        <label htmlFor="testMode">Test Mode</label>
      </div>
      
      {testMode && (
        <>
          <div className="form-group">
            <label className="label" htmlFor="simulateRiskScore">Simulate Risk Score (0-100, empty for default)</label>
            <input
              id="simulateRiskScore"
              className="input"
              type="number"
              min="0"
              max="100"
              value={simulateRiskScore === undefined ? '' : simulateRiskScore}
              onChange={(e) => setSimulateRiskScore(e.target.value === '' ? undefined : Number(e.target.value))}
            />
          </div>
          
          <div className="form-group flex items-center">
            <input
              id="simulateFraud"
              type="checkbox"
              checked={simulateFraud}
              onChange={(e) => setSimulateFraud(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="simulateFraud">Simulate Fraud Detection</label>
          </div>
        </>
      )}
      
      <button 
        className="btn btn-primary"
        onClick={handleInitialize}
        disabled={isInitialized}
      >
        {isInitialized ? 'SDK Initialized' : 'Initialize SDK'}
      </button>
      
      {isInitialized && (
        <p className="mt-2 text-green-600">SDK initialized successfully!</p>
      )}
    </div>
  )
} 