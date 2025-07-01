import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { AuthCookies, SecurityCookies, AnalyticsCookies } from '../../utils/cookies'
import './SignIn.css'

const SignIn = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberEmail, setRememberEmail] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetMessage, setResetMessage] = useState('')

  const { signIn, resetPassword } = useAuth()

  // Load user preferences and remembered data on component mount
  useEffect(() => {
    // Load remembered email if exists
    const rememberedEmail = AuthCookies.getRememberedEmail()
    if (rememberedEmail) {
      setEmail(rememberedEmail)
      setRememberEmail(true)
    }

    // Check for security issues
    const failedAttempts = SecurityCookies.getFailedAttempts()
    if (failedAttempts >= 5) {
      setError('Too many failed attempts. Please try again later or reset your password.')
    }

    // Track page view for analytics (if consented)
    AnalyticsCookies.trackPageView('/signin')
    
    // Track feature usage
    AnalyticsCookies.trackFeatureUsage('signin_page_visit')

    // Apply user theme preference
    applyUserTheme()
  }, [])

  const applyUserTheme = () => {
    const theme = AuthCookies.getTheme()
    document.documentElement.setAttribute('data-theme', theme)
  }

  const generateDeviceFingerprint = () => {
    try {
      const fingerprint = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screen: `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        cookiesEnabled: navigator.cookieEnabled,
        timestamp: Date.now()
      }
      
      // Create a simple hash
      const hash = btoa(JSON.stringify(fingerprint))
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 32)
      
      return hash
    } catch (error) {
      console.error('Error generating fingerprint:', error)
      return 'unknown'
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)
    setError('')

    // Track sign-in attempt
    AnalyticsCookies.trackEvent('signin_attempt', {
      email_domain: email.split('@')[1],
      remember_email: rememberEmail,
      failed_attempts_before: SecurityCookies.getFailedAttempts()
    })

    const { error: signInError } = await signIn(email, password)
    
    if (signInError) {
      // Handle failed sign-in
      setError(signInError.message)
      
      // Track failed attempts for security
      SecurityCookies.incrementFailedAttempts()
      const attempts = SecurityCookies.getFailedAttempts()
      
      // Flag suspicious activity after multiple failures
      if (attempts >= 3) {
        SecurityCookies.flagSuspiciousActivity(`Multiple failed login attempts: ${attempts}`)
        setError(`${signInError.message} (${attempts} failed attempts)`)
      }
      
      // Track failed sign-in
      AnalyticsCookies.trackEvent('signin_failed', {
        error_type: signInError.message,
        failed_attempts: attempts
      })
    } else {
      // Handle successful sign-in
      SecurityCookies.clearFailedAttempts()
      SecurityCookies.setLastLogin()
      
      // Handle remember email preference
      if (rememberEmail) {
        AuthCookies.setRememberedEmail(email)
      } else {
        AuthCookies.clearRememberedEmail()
      }
      
      // Generate and store device fingerprint for security
      const fingerprint = generateDeviceFingerprint()
      SecurityCookies.setDeviceFingerprint(fingerprint)
      
      // Mark user as returning user if this is not their first time
      AuthCookies.markAsReturningUser()
      
      // Track successful sign-in
      AnalyticsCookies.trackEvent('signin_success', {
        email_domain: email.split('@')[1],
        is_remembered_email: !!AuthCookies.getRememberedEmail(),
        device_fingerprint: fingerprint.substring(0, 8) // Only first 8 chars for privacy
      })
      
      // Start analytics session if consented
      if (AnalyticsCookies.hasAnalyticsConsent()) {
        AnalyticsCookies.startSession()
      }
    }
    
    setLoading(false)
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    
    if (!resetEmail) {
      setError('Please enter your email address')
      return
    }

    setLoading(true)
    setError('')
    setResetMessage('')

    // Track password reset request
    AnalyticsCookies.trackEvent('password_reset_requested', {
      email_domain: resetEmail.split('@')[1]
    })

    const { error } = await resetPassword(resetEmail)
    
    if (error) {
      setError(error.message)
      AnalyticsCookies.trackEvent('password_reset_failed', {
        error_type: error.message
      })
    } else {
      setResetMessage('Check your email for password reset instructions')
      AnalyticsCookies.trackEvent('password_reset_sent', {
        email_domain: resetEmail.split('@')[1]
      })
    }
    
    setLoading(false)
  }

  const handleRememberEmailChange = (checked) => {
    setRememberEmail(checked)
    
    // Track preference change
    AnalyticsCookies.trackEvent('remember_email_toggled', {
      enabled: checked
    })
  }

  if (showForgotPassword) {
    return (
      <div className="signin-container">
        <form onSubmit={handleForgotPassword} className="signin-form">
          <div className="form-group">
            <label htmlFor="reset-email" className="form-label">
              Email address
            </label>
            <input
              id="reset-email"
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="form-input"
              placeholder="Enter your email"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          {resetMessage && (
            <div className="success-message">
              <span className="success-icon">✅</span>
              {resetMessage}
            </div>
          )}

          <button 
            type="submit" 
            className="signin-btn"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Reset Email'}
          </button>

          <button
            type="button"
            className="forgot-password-btn"
            onClick={() => {
              setShowForgotPassword(false)
              setError('')
              setResetMessage('')
              setResetEmail('')
              
              // Track navigation back to sign-in
              AnalyticsCookies.trackEvent('forgot_password_cancelled')
            }}
          >
            Back to Sign In
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
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-input"
            placeholder="Enter your email"
            disabled={loading}
            autoComplete="email"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password" className="form-label">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-input"
            placeholder="Enter your password"
            disabled={loading}
            autoComplete="current-password"
          />
        </div>

        {/* Remember Email Checkbox */}
        <div className="form-options">
          <label className="remember-checkbox">
            <input
              type="checkbox"
              checked={rememberEmail}
              onChange={(e) => handleRememberEmailChange(e.target.checked)}
              disabled={loading}
            />
            <span className="checkmark"></span>
            <span className="checkbox-text">Remember my email</span>
          </label>
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        <button 
          type="submit" 
          className="signin-btn"
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>

        <button
          type="button"
          className="forgot-password-btn"
          onClick={() => {
            setShowForgotPassword(true)
            AnalyticsCookies.trackEvent('forgot_password_clicked')
          }}
        >
          Forgot your password?
        </button>
      </form>
    </div>
  )
}

export default SignIn