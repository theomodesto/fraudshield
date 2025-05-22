// 'use client' // Removed Next.js directive

import React, { useState, useEffect, Suspense, lazy } from 'react'
import type { FraudShield } from '@fraudshield/sdk'
import { darkTheme } from '@uiw/react-json-view/dark'

const JsonView = lazy(() => import('@uiw/react-json-view'))

interface FingerprintInfoProps {
  sdkInstance: FraudShield | null
  fingerprint: any
}

const FingerprintInfo: React.FC<FingerprintInfoProps> = ({ sdkInstance, fingerprint }) => {
  const [loading, setLoading] = useState(false) // Keep loading state for button
  const [error, setError] = useState<string | null>(null)

  const handleGetFingerprint = async () => {
    if (!sdkInstance) return
    setLoading(true)
    setError(null)
    try {
      // Assuming the parent component will update the fingerprint prop
      // after this call if necessary, or this button is just for re-triggering.
      await sdkInstance.getDeviceFingerprint()
      // If the parent isn't re-fetching and passing a new fingerprint,
      // this button won't visually update the JsonView unless a local state is used.
      // For now, we assume parent handles the update of the fingerprint prop.
    } catch (err: any) {
      setError(`Error getting fingerprint: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 border rounded shadow-sm">
      <h2 className="text-xl font-semibold mb-3">Device Fingerprint</h2>
      <button
        onClick={handleGetFingerprint}
        disabled={!sdkInstance || loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 mb-3"
      >
        {loading ? 'Getting Fingerprint...' : 'Get/Refresh Fingerprint'}
      </button>
      {error && <div className="text-red-500 mb-2">Error: {error}</div>}
      {fingerprint && (
        <div className="mt-4 border p-4 rounded bg-gray-50 overflow-auto">
          <h3 className="font-bold mb-2">Fingerprint Result:</h3>
          <Suspense fallback={<div>Loading JSON Viewer...</div>}>
            <JsonView value={fingerprint} style={darkTheme} collapsed={1} keyName="fingerprint" />
          </Suspense>
        </div>
      )}
      {!fingerprint && !error && !loading && (
        <div>Click the button to fetch the device fingerprint.</div>
      )}
    </div>
  )
}

export default FingerprintInfo 