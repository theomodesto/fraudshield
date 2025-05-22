'use client'

import { useState } from 'react'
import SdkInitializer from '@/components/SdkInitializer'
import FingerprintInfo from '@/components/FingerprintInfo'
import TestRiskScores from '@/components/TestRiskScores'
import TestForms from '@/components/TestForms'
import type { FraudShield } from '@fraudshield/sdk'

export default function Home() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [sdkInstance, setSdkInstance] = useState<any>(null)
  
  return (
    <div>
      <div className="card">
        <h2 className="text-lg font-bold mb-4">SDK Initialization</h2>
        <SdkInitializer 
          onInitialized={(instance: FraudShield) => {
            setIsInitialized(true)
            setSdkInstance(instance)
          }} 
        />
      </div>
      
      {isInitialized && (
        <>
          <div className="card">
            <h2 className="text-lg font-bold mb-4">Device Fingerprint</h2>
            <FingerprintInfo sdkInstance={sdkInstance} />
          </div>
          
          <div className="card">
            <h2 className="text-lg font-bold mb-4">Test Risk Scores</h2>
            <TestRiskScores sdkInstance={sdkInstance} />
          </div>
          
          <div className="card">
            <h2 className="text-lg font-bold mb-4">Test Forms and Actions</h2>
            <TestForms sdkInstance={sdkInstance} />
          </div>
        </>
      )}
    </div>
  )
} 