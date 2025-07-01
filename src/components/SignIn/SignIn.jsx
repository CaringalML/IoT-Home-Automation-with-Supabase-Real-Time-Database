import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import './SignIn.css'

const SignIn = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetMessage, setResetMessage] = useState('')

  const { signIn, resetPassword } = useAuth()

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  useEffect(() => {
    if (resetMessage) {
      const timer = setTimeout(() => setResetMessage(''), 8000)
      return () => clearTimeout(timer)
    }
  }, [resetMessage])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!email || !password) {
      setError('🔐 Please fill in all fields to access your smart home')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('📧 Please enter a valid email address')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error: signInError } = await signIn(email, password)
      
      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError('🚫 Invalid credentials. Check your email and password')
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('📬 Please verify your email address before signing in')
        } else {
          setError(`⚠️ ${signInError.message}`)
        }
      }
    } catch (err) {
      setError('🌐 Connection error. Please check your internet connection')
    }
    
    setLoading(false)
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    
    if (!resetEmail) {
      setError('📧 Please enter your email address')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(resetEmail)) {
      setError('📧 Please enter a valid email address')
      return
    }

    setLoading(true)
    setError('')
    setResetMessage('')

    try {
      const { error } = await resetPassword(resetEmail)
      
      if (error) {
        setError(`⚠️ ${error.message}`)
      } else {
        setResetMessage('✉️ Password reset instructions sent! Check your email inbox')
      }
    } catch (err) {
      setError('🌐 Connection error. Please try again')
    }
    
    setLoading(false)
  }

  const handleBackToSignIn = () => {
    setShowForgotPassword(false)
    setError('')
    setResetMessage('')
    setResetEmail('')
  }

  if (showForgotPassword) {
    return (
      <div className="signin-container">
        <form onSubmit={handleForgotPassword} className="signin-form">
          <div className="form-group">
            <label htmlFor="reset-email" className="form-label">
              🔑 Recovery Email
            </label>
            <input
              id="reset-email"
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="form-input"
              placeholder="Enter your registered email address"
              disabled={loading}
              autoComplete="email"
            />
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {resetMessage && (
            <div className="success-message">
              <span className="success-icon">✅</span>
              <span>{resetMessage}</span>
            </div>
          )}

          <button 
            type="submit" 
            className="signin-btn"
            disabled={loading}
          >
            {loading ? (
              <span>🔄 Sending Reset Link...</span>
            ) : (
              <span>📤 Send Reset Link</span>
            )}
          </button>

          <button
            type="button"
            className="forgot-password-btn"
            onClick={handleBackToSignIn}
            disabled={loading}
          >
            ← Back to Smart Home Login
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="signin-container">
      <form onSubmit={handleSubmit} className="signin-form">
        <div className="form-group">
          <label htmlFor="email" className="form-label">
            📧 Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-input"
            placeholder="Enter your smart home email"
            disabled={loading}
            autoComplete="email"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password" className="form-label">
            🔐 Secure Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-input"
            placeholder="Enter your secure password"
            disabled={loading}
            autoComplete="current-password"
          />
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <button 
          type="submit" 
          className="signin-btn"
          disabled={loading}
        >
          {loading ? (
            <span>🔄 Connecting to Smart Home...</span>
          ) : (
            <span>🏠 Access Smart Home</span>
          )}
        </button>

        <button
          type="button"
          className="forgot-password-btn"
          onClick={() => setShowForgotPassword(true)}
          disabled={loading}
        >
          🔑 Forgot your access code?
        </button>
      </form>
    </div>
  )
}

export default SignIn