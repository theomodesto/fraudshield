// 'use client' // Removed Next.js directive

import React, { useState, Suspense, lazy } from 'react'
import type { FraudShield, PageContext, EvaluationResult } from '@fraudshield/sdk'
import { darkTheme } from '@uiw/react-json-view/dark'
// import dynamic from 'next/dynamic' // Removed next/dynamic

// Dynamically import ReactJson
const JsonView = lazy(() => import('@uiw/react-json-view'))

interface TestFormsProps {
  sdkInstance: FraudShield
}

export default function TestForms({ sdkInstance }: TestFormsProps) {
  const [activeForm, setActiveForm] = useState('login')
  const [lastResult, setLastResult] = useState<EvaluationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form states
  const [email, setEmail] = useState('test@example.com')
  const [password, setPassword] = useState('password123')
  const [name, setName] = useState('Test User')
  const [address, setAddress] = useState('123 Test St')
  const [cardNumber, setCardNumber] = useState('4111111111111111')
  const [cardExpiry, setCardExpiry] = useState('12/25')
  const [cardCvv, setCardCvv] = useState('123')
  
  const handleFormSubmit = async (event: React.FormEvent, action: string) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      // Create form data based on form type
      let pageData: Record<string, any> = {}
      
      if (action === 'login') {
        pageData = { email }
      } else if (action === 'signup') {
        pageData = { email, name }
      } else if (action === 'checkout') {
        pageData = {
          email,
          name,
          address,
          hasPaymentInfo: true
        }
      } else if (action === 'payment') {
        pageData = {
          cardDetails: {
            last4: cardNumber.slice(-4),
            expiryMonth: cardExpiry.split('/')[0],
            expiryYear: cardExpiry.split('/')[1],
            hasValidCvv: cardCvv.length === 3
          },
          amount: 99.99,
          currency: 'USD'
        }
      }
      
      // Evaluate with SDK
      const result = await sdkInstance.evaluate({
        userAction: action,
        pageData
      })
      
      setLastResult(result)
      
      // Simulate form submission response
      setTimeout(() => {
        if (result.isFraud) {
          setError('Transaction blocked due to fraud detection')
        } else if (result.requiresCaptcha) {
          setError('Please complete the CAPTCHA to continue')
        } else {
          // Form submission "succeeded"
          setError(null)
        }
        
        setLoading(false)
      }, 500)
      
    } catch (err: any) {
      setError(`Error during evaluation: ${err.message}`)
      setLoading(false)
    }
  }
  
  const renderLoginForm = () => (
    <form onSubmit={(e) => handleFormSubmit(e, 'login')} className="border p-4 rounded">
      <h3 className="font-bold mb-4">Login Form</h3>
      
      <div className="form-group">
        <label className="label" htmlFor="login-email">Email</label>
        <input
          id="login-email"
          className="input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      
      <div className="form-group">
        <label className="label" htmlFor="login-password">Password</label>
        <input
          id="login-password"
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Processing...' : 'Log In'}
      </button>
    </form>
  )
  
  const renderSignupForm = () => (
    <form onSubmit={(e) => handleFormSubmit(e, 'signup')} className="border p-4 rounded">
      <h3 className="font-bold mb-4">Sign Up Form</h3>
      
      <div className="form-group">
        <label className="label" htmlFor="signup-name">Full Name</label>
        <input
          id="signup-name"
          className="input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      
      <div className="form-group">
        <label className="label" htmlFor="signup-email">Email</label>
        <input
          id="signup-email"
          className="input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      
      <div className="form-group">
        <label className="label" htmlFor="signup-password">Password</label>
        <input
          id="signup-password"
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Processing...' : 'Sign Up'}
      </button>
    </form>
  )
  
  const renderCheckoutForm = () => (
    <form onSubmit={(e) => handleFormSubmit(e, 'checkout')} className="border p-4 rounded">
      <h3 className="font-bold mb-4">Checkout Form</h3>
      
      <div className="form-group">
        <label className="label" htmlFor="checkout-name">Full Name</label>
        <input
          id="checkout-name"
          className="input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      
      <div className="form-group">
        <label className="label" htmlFor="checkout-email">Email</label>
        <input
          id="checkout-email"
          className="input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      
      <div className="form-group">
        <label className="label" htmlFor="checkout-address">Shipping Address</label>
        <input
          id="checkout-address"
          className="input"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
        />
      </div>
      
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Processing...' : 'Continue to Payment'}
      </button>
    </form>
  )
  
  const renderPaymentForm = () => (
    <form onSubmit={(e) => handleFormSubmit(e, 'payment')} className="border p-4 rounded">
      <h3 className="font-bold mb-4">Payment Form</h3>
      
      <div className="form-group">
        <label className="label" htmlFor="payment-card">Card Number</label>
        <input
          id="payment-card"
          className="input"
          type="text"
          value={cardNumber}
          onChange={(e) => setCardNumber(e.target.value)}
          required
        />
      </div>
      
      <div className="flex gap-4">
        <div className="form-group flex-1">
          <label className="label" htmlFor="payment-expiry">Expiry (MM/YY)</label>
          <input
            id="payment-expiry"
            className="input"
            type="text"
            value={cardExpiry}
            onChange={(e) => setCardExpiry(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group flex-1">
          <label className="label" htmlFor="payment-cvv">CVV</label>
          <input
            id="payment-cvv"
            className="input"
            type="text"
            value={cardCvv}
            onChange={(e) => setCardCvv(e.target.value)}
            required
          />
        </div>
      </div>
      
      <div className="mb-4 p-2 bg-gray-100 rounded">
        <div className="font-bold">Order Total: $99.99</div>
      </div>
      
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Processing...' : 'Pay Now'}
      </button>
    </form>
  )
  
  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button 
          className={`btn ${activeForm === 'login' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveForm('login')}
        >
          Login Form
        </button>
        <button 
          className={`btn ${activeForm === 'signup' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveForm('signup')}
        >
          Sign Up Form
        </button>
        <button 
          className={`btn ${activeForm === 'checkout' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveForm('checkout')}
        >
          Checkout Form
        </button>
        <button 
          className={`btn ${activeForm === 'payment' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveForm('payment')}
        >
          Payment Form
        </button>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mb-4 rounded">
          {error}
        </div>
      )}
      
      <div className="mb-4">
        {activeForm === 'login' && renderLoginForm()}
        {activeForm === 'signup' && renderSignupForm()}
        {activeForm === 'checkout' && renderCheckoutForm()}
        {activeForm === 'payment' && renderPaymentForm()}
      </div>
      
      {lastResult && (
        <div className="mt-4 border p-4 rounded bg-gray-50 overflow-auto">
          <h3 className="font-bold mb-2">Full Evaluation Result:</h3>
          <Suspense fallback={<div>Loading JSON Viewer...</div>}>
            <JsonView value={lastResult} style={darkTheme} collapsed={1} keyName="results" />
          </Suspense>
        </div>
      )}
    </div>
  )
} 