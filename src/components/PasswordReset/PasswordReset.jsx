import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import './PasswordReset.css'

const PasswordReset = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { verifyResetToken, updatePasswordWithToken, signOut } = useAuth()
  
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [validToken, setValidToken] = useState(false)
  const [checkingToken, setCheckingToken] = useState(true)
  const [resetToken, setResetToken] = useState(null) // Store the token for later use

  // Check if we have valid reset tokens from the URL
  useEffect(() => {
    const checkResetToken = async () => {
      // Get URL parameters
      const accessToken = searchParams.get('access_token')
      const type = searchParams.get('type')
      
      console.log('=== PASSWORD RESET DEBUG ===')
      console.log('URL Parameters:', { accessToken, type })
      console.log('Full URL:', window.location.href)
      console.log('Search params:', searchParams.toString())

      // Check if we have the basic requirements
      if (!accessToken) {
        console.log('❌ No access token found')
        setError('Invalid reset link. Please request a new password reset.')
        setCheckingToken(false)
        return
      }

      if (type !== 'recovery') {
        console.log('❌ Wrong type or no type:', type)
        setError('Invalid reset link. Please request a new password reset.')
        setCheckingToken(false)
        return
      }

      console.log('✅ Basic validation passed, verifying token...')

      try {
        // Use the verifyResetToken function from AuthContext
        const result = await verifyResetToken(accessToken)
        
        console.log('Token verification result:', result)
        
        if (result.success) {
          console.log('✅ Token verification successful!')
          setValidToken(true)
          setResetToken(accessToken) // Store the token for password update
        } else {
          console.log('❌ Token verification failed:', result.error)
          setError('Invalid or expired reset link. Please request a new password reset.')
        }
      } catch (err) {
        console.error('❌ Token verification error:', err)
        setError('Invalid or expired reset link. Please request a new password reset.')
      }
      
      setCheckingToken(false)
    }

    checkResetToken()
  }, [searchParams, verifyResetToken])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const validateForm = () => {
    const { newPassword, confirmPassword } = formData

    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields')
      return false
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long')
      return false
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return false
    }

    // Password strength validation
    const hasUpperCase = /[A-Z]/.test(newPassword)
    const hasLowerCase = /[a-z]/.test(newPassword)
    const hasNumbers = /\d/.test(newPassword)
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      setError('Password must contain at least one uppercase letter, one lowercase letter, and one number')
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    setError('')

    try {
      console.log('=== SUBMITTING PASSWORD RESET ===')
      console.log('Using token:', resetToken?.substring(0, 20) + '...')
      
      const { error } = await updatePasswordWithToken(formData.newPassword, resetToken)

      if (error) {
        console.error('Password update error:', error)
        setError(error.message)
      } else {
        console.log('✅ Password updated successfully!')
        setSuccess(true)
        
        // Sign out the user and redirect to sign-in page
        console.log('Signing out user and redirecting to sign-in...')
        setTimeout(async () => {
          await signOut()
          navigate('/auth')
        }, 2000)
      }
    } catch (err) {
      console.error('Password update exception:', err)
      setError('An unexpected error occurred. Please try again.')
    }
    
    setLoading(false)
  }

  const handleBackToSignIn = () => {
    navigate('/auth')
  }

  if (checkingToken) {
    return (
      <div className="password-reset-container">
        <div className="password-reset-background">
          <div className="password-reset-card">
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Verifying reset link...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!validToken) {
    return (
      <div className="password-reset-container">
        <div className="password-reset-background">
          <div className="password-reset-card">
            <div className="error-state">
              <div className="error-icon">❌</div>
              <h2>Invalid Reset Link</h2>
              <p>This password reset link is invalid or has expired. Please request a new password reset.</p>
              <button 
                onClick={handleBackToSignIn}
                className="back-to-signin-btn"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="password-reset-container">
        <div className="password-reset-background">
          <div className="password-reset-card">
            <div className="success-state">
              <div className="success-icon">✅</div>
              <h2>Password Updated Successfully!</h2>
              <p>Your password has been updated. You will be redirected to the sign-in page shortly.</p>
              <button 
                onClick={handleBackToSignIn}
                className="signin-redirect-btn"
              >
                Sign In Now
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="password-reset-container">
      <div className="password-reset-background">
        <div className="password-reset-card">
          <div className="password-reset-header">
            <div className="reset-logo">
              <div className="logo-icon">🔐</div>
              <h1>Reset Your Password</h1>
            </div>
            <p className="reset-subtitle">
              Enter your new password below
            </p>
          </div>

          <form onSubmit={handleSubmit} className="password-reset-form">
            <div className="form-group">
              <label htmlFor="newPassword" className="form-label">
                New Password
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={handleChange}
                className="form-input"
                placeholder="Enter your new password"
                disabled={loading}
              />
              <div className="password-requirements">
                <p>Password must contain:</p>
                <ul>
                  <li className={/[A-Z]/.test(formData.newPassword) ? 'valid' : ''}>
                    One uppercase letter
                  </li>
                  <li className={/[a-z]/.test(formData.newPassword) ? 'valid' : ''}>
                    One lowercase letter
                  </li>
                  <li className={/\d/.test(formData.newPassword) ? 'valid' : ''}>
                    One number
                  </li>
                  <li className={formData.newPassword.length >= 6 ? 'valid' : ''}>
                    At least 6 characters
                  </li>
                </ul>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="form-input"
                placeholder="Confirm your new password"
                disabled={loading}
              />
              {formData.confirmPassword && (
                <div className={`password-match ${
                  formData.newPassword === formData.confirmPassword ? 'match' : 'no-match'
                }`}>
                  {formData.newPassword === formData.confirmPassword ? 
                    '✅ Passwords match' : 
                    '❌ Passwords do not match'
                  }
                </div>
              )}
            </div>

            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}

            <button 
              type="submit" 
              className="reset-password-btn"
              disabled={loading || !formData.newPassword || !formData.confirmPassword}
            >
              {loading ? 'Updating Password...' : 'Update Password'}
            </button>

            <button
              type="button"
              className="cancel-reset-btn"
              onClick={handleBackToSignIn}
              disabled={loading}
            >
              Cancel
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default PasswordReset