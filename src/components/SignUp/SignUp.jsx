import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import TermsModal from '../TermsModal/TermsModal'
import './SignUp.css'

const SignUp = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Modal states
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [privacyAccepted, setPrivacyAccepted] = useState(false)

  const { signUp } = useAuth()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const validateForm = () => {
    const { fullName, email, password, confirmPassword } = formData

    if (!fullName || !email || !password || !confirmPassword) {
      setError('Please fill in all fields')
      return false
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return false
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      return false
    }

    if (!termsAccepted || !privacyAccepted) {
      setError('Please accept both Terms of Service and Privacy Policy to continue')
      return false
    }

    return true
  }

  const handleModalAccept = (type) => {
    if (type === 'terms') {
      setTermsAccepted(true)
    } else if (type === 'privacy') {
      setPrivacyAccepted(true)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    const { error } = await signUp(
      formData.email, 
      formData.password, 
      formData.fullName
    )
    
    if (error) {
      setError(error.message)
    } else {
      setSuccess('Account created successfully! Please check your email to verify your account.')
      setFormData({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: ''
      })
    }
    
    setLoading(false)
  }

  return (
    <div className="signup-container">
      <form onSubmit={handleSubmit} className="signup-form">
        <div className="form-group">
          <label htmlFor="fullName" className="form-label">
            Full name
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            value={formData.fullName}
            onChange={handleChange}
            className="form-input"
            placeholder="Enter your full name"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="email" className="form-label">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            className="form-input"
            placeholder="Enter your email"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password" className="form-label">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            className="form-input"
            placeholder="Create a password"
            disabled={loading}
          />
          <div className="password-hint">
            Password must be at least 6 characters long
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword" className="form-label">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="form-input"
            placeholder="Confirm your password"
            disabled={loading}
          />
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        {success && (
          <div className="success-message">
            <span className="success-icon">✅</span>
            {success}
          </div>
        )}

        <button 
          type="submit" 
          className="signup-btn"
          disabled={loading || !termsAccepted || !privacyAccepted}
        >
          {loading ? 'Creating account...' : 'Create account'}
        </button>

        <div className="terms-notice">
          <div className="terms-checkboxes">
            <label className="terms-checkbox-item">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={() => setShowTermsModal(true)}
                disabled={loading}
              />
              <span className="terms-checkmark"></span>
              <span className="terms-text">
                I agree to the{' '}
                <button 
                  type="button" 
                  className="terms-link"
                  onClick={() => setShowTermsModal(true)}
                >
                  Terms of Service
                </button>
              </span>
            </label>

            <label className="terms-checkbox-item">
              <input
                type="checkbox"
                checked={privacyAccepted}
                onChange={() => setShowPrivacyModal(true)}
                disabled={loading}
              />
              <span className="terms-checkmark"></span>
              <span className="terms-text">
                I agree to the{' '}
                <button 
                  type="button" 
                  className="terms-link"
                  onClick={() => setShowPrivacyModal(true)}
                >
                  Privacy Policy
                </button>
              </span>
            </label>
          </div>

          <p className="terms-requirement">
            Both agreements must be accepted to create an account
          </p>
        </div>
      </form>

      {/* Terms of Service Modal */}
      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={handleModalAccept}
        type="terms"
      />

      {/* Privacy Policy Modal */}
      <TermsModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        onAccept={handleModalAccept}
        type="privacy"
      />
    </div>
  )
}

export default SignUp