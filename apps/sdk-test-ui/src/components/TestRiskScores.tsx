// 'use client' // Removed Next.js directive

import React, { useState, Suspense, lazy } from 'react'
import type { FraudShield, EvaluationResult, PageContext } from '@fraudshield/sdk'
import { darkTheme } from '@uiw/react-json-view/dark'

// Dynamically import JsonView
const JsonView = lazy(() => import('@uiw/react-json-view'))

interface TestRiskScoresProps {
  sdkInstance: FraudShield
}

export default function TestRiskScores({ sdkInstance }: TestRiskScoresProps) {
  const [userAction, setUserAction] = useState('checkout')
  const [pageData, setPageData] = useState('{}')
  const [results, setResults] = useState<EvaluationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleEvaluate = async () => {
    setLoading(true)
    setError(null)
    
    try {
      let parsedPageData = {}
      
      try {
        parsedPageData = JSON.parse(pageData)
      } catch (err) {
        setError('Invalid JSON in page data')
        setLoading(false)
        return
      }
      
      const context: PageContext = {
        userAction,
        pageData: parsedPageData
      }
      
      const result = await sdkInstance.evaluate(context)
      setResults(result)
    } catch (err: any) {
      setError(`Error during evaluation: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const getRiskColor = (score: number) => {
    if (score < 30) return 'bg-green-100 text-green-800'
    if (score < 70) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  return (
    <div>
      <div className="mb-4">
        <div className="form-group">
          <label className="label" htmlFor="userAction">User Action</label>
          <select
            id="userAction"
            className="input"
            value={userAction}
            onChange={(e) => setUserAction(e.target.value)}
          >
            <option value="checkout">Checkout</option>
            <option value="login">Login</option>
            <option value="signup">Sign Up</option>
            <option value="pageview">Page View</option>
            <option value="payment">Payment</option>
          </select>
        </div>
        
        <div className="form-group">
          <label className="label" htmlFor="pageData">Page Data (JSON)</label>
          <textarea
            id="pageData"
            className="input h-24"
            value={pageData}
            onChange={(e) => setPageData(e.target.value)}
          />
        </div>
        
        <button 
          className="btn btn-primary" 
          onClick={handleEvaluate}
          disabled={loading}
        >
          {loading ? 'Evaluating...' : 'Evaluate Risk'}
        </button>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mb-4 rounded">
          {error}
        </div>
      )}
      
      {results && (
        <div className="mt-4">
          <div className="flex gap-4 mb-4">
            <div className="flex-1 p-4 rounded border">
              <div className="text-xl font-bold">Risk Score</div>
              <div className={`text-3xl font-bold mt-2 px-2 py-1 rounded inline-block ${getRiskColor(results.riskScore)}`}>
                {results.riskScore}
              </div>
            </div>
            
            <div className="flex-1 p-4 rounded border">
              <div className="text-xl font-bold">Fraud Detection</div>
              <div className={`text-xl font-bold mt-2 px-2 py-1 rounded inline-block ${results.isFraud ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                {results.isFraud ? 'FRAUD DETECTED' : 'NO FRAUD'}
              </div>
            </div>
            
            <div className="flex-1 p-4 rounded border">
              <div className="text-xl font-bold">CAPTCHA</div>
              <div className={`text-xl font-bold mt-2 px-2 py-1 rounded inline-block ${results.requiresCaptcha ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                {results.requiresCaptcha ? 'REQUIRED' : 'NOT REQUIRED'}
              </div>
            </div>
          </div>
          
          <div className="mt-4 border p-4 rounded bg-gray-50 overflow-auto">
            <h3 className="font-bold mb-2">Full Evaluation Result:</h3>
            <Suspense fallback={<div>Loading JSON Viewer...</div>}>
              <JsonView value={results} style={darkTheme} collapsed={1} keyName="results" />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  )
} 