import React, { useState, useEffect } from 'react'
import { ConsentManager, AnalyticsCookies } from '../../utils/cookies'
import './CookieBanner.css'

const CookieBanner = () => {
  const [showBanner, setShowBanner] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [preferences, setPreferences] = useState({
    necessary: true, // Always true, can't be disabled
    functional: false,
    analytics: false,
    marketing: false
  })

  useEffect(() => {
    // Check if user has already given consent
    const hasConsent = ConsentManager.hasGivenConsent()
    if (!hasConsent) {
      setShowBanner(true)
    } else {
      // Load existing preferences
      const existingPrefs = ConsentManager.getConsentPreferences()
      setPreferences(existingPrefs)
    }
  }, [])

  const handleAcceptAll = async () => {
    setIsLoading(true)
    
    const allPreferences = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true
    }
    
    await saveCookiePreferences(allPreferences)
    setShowBanner(false)
    setIsLoading(false)
  }

  const handleAcceptSelected = async () => {
    setIsLoading(true)
    await saveCookiePreferences(preferences)
    setShowBanner(false)
    setIsLoading(false)
  }

  const handleRejectAll = async () => {
    setIsLoading(true)
    
    const minimalPreferences = {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false
    }
    
    await saveCookiePreferences(minimalPreferences)
    setShowBanner(false)
    setIsLoading(false)
  }

  const saveCookiePreferences = async (prefs) => {
    try {
      // Save consent preferences
      ConsentManager.setConsentPreferences(prefs)
      
      // Initialize analytics if consented
      if (prefs.analytics) {
        AnalyticsCookies.startSession()
        
        // Track consent given event
        AnalyticsCookies.trackEvent('cookie_consent_given', {
          preferences: prefs,
          source: 'cookie_banner'
        })
      }
      
      // Clear non-essential cookies if not consented
      if (!prefs.analytics && !prefs.marketing && !prefs.functional) {
        ConsentManager.clearNonEssentialCookies()
      }
      
      // Dispatch event for other components to listen to
      window.dispatchEvent(new CustomEvent('cookiePreferencesUpdated', { 
        detail: prefs 
      }))
      
      // Show success message briefly
      showSuccessMessage()
      
    } catch (error) {
      console.error('Error saving cookie preferences:', error)
      showErrorMessage()
    }
  }

  const showSuccessMessage = () => {
    const message = document.createElement('div')
    message.className = 'cookie-success-message'
    message.innerHTML = `
      <div class="success-content">
        <span class="success-icon">✅</span>
        <span>Cookie preferences saved successfully!</span>
      </div>
    `
    document.body.appendChild(message)
    
    setTimeout(() => {
      if (message.parentNode) {
        message.parentNode.removeChild(message)
      }
    }, 3000)
  }

  const showErrorMessage = () => {
    const message = document.createElement('div')
    message.className = 'cookie-error-message'
    message.innerHTML = `
      <div class="error-content">
        <span class="error-icon">❌</span>
        <span>Error saving preferences. Please try again.</span>
      </div>
    `
    document.body.appendChild(message)
    
    setTimeout(() => {
      if (message.parentNode) {
        message.parentNode.removeChild(message)
      }
    }, 3000)
  }

  const handlePreferenceChange = (type) => {
    if (type === 'necessary') return // Cannot change necessary cookies
    
    setPreferences(prev => ({
      ...prev,
      [type]: !prev[type]
    }))
  }

  const openCookieSettings = () => {
    setShowBanner(true)
    setShowDetails(true)
  }

  // Expose function globally for cookie settings link
  useEffect(() => {
    window.openCookieSettings = openCookieSettings
    return () => {
      delete window.openCookieSettings
    }
  }, [])

  if (!showBanner) return null

  return (
    <>
      <div className="cookie-banner-overlay" onClick={() => !isLoading && setShowBanner(false)} />
      <div className="cookie-banner">
        <div className="cookie-banner-content">
          <div className="cookie-info">
            <div className="cookie-icon">🍪</div>
            <div className="cookie-text">
              <h3>We value your privacy</h3>
              <p>
                We use cookies to enhance your browsing experience, serve personalized content, 
                and analyze our traffic. You can choose which cookies you're comfortable with below.
              </p>
            </div>
          </div>

          {!showDetails ? (
            <div className="cookie-actions">
              <button 
                className="cookie-btn cookie-btn-secondary"
                onClick={() => setShowDetails(true)}
                disabled={isLoading}
              >
                Customize
              </button>
              <button 
                className="cookie-btn cookie-btn-reject"
                onClick={handleRejectAll}
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : 'Reject All'}
              </button>
              <button 
                className="cookie-btn cookie-btn-primary"
                onClick={handleAcceptAll}
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : 'Accept All'}
              </button>
            </div>
          ) : (
            <div className="cookie-details">
              <div className="cookie-categories">
                <div className="cookie-category">
                  <div className="category-header">
                    <label className="category-label">
                      <input
                        type="checkbox"
                        checked={preferences.necessary}
                        disabled={true}
                        readOnly
                      />
                      <span className="category-name">Necessary Cookies</span>
                      <span className="category-status required">Required</span>
                    </label>
                  </div>
                  <p className="category-description">
                    Essential for the website to function properly. These include authentication, 
                    security, and basic functionality. These cannot be disabled.
                  </p>
                  <div className="category-examples">
                    <strong>Examples:</strong> Login state, security tokens, CSRF protection
                  </div>
                </div>

                <div className="cookie-category">
                  <div className="category-header">
                    <label className="category-label">
                      <input
                        type="checkbox"
                        checked={preferences.functional}
                        onChange={() => handlePreferenceChange('functional')}
                        disabled={isLoading}
                      />
                      <span className="category-name">Functional Cookies</span>
                    </label>
                  </div>
                  <p className="category-description">
                    Remember your preferences and settings to provide a personalized experience. 
                    These improve your user experience but are not essential.
                  </p>
                  <div className="category-examples">
                    <strong>Examples:</strong> Theme preferences, language settings, remembered email
                  </div>
                </div>

                <div className="cookie-category">
                  <div className="category-header">
                    <label className="category-label">
                      <input
                        type="checkbox"
                        checked={preferences.analytics}
                        onChange={() => handlePreferenceChange('analytics')}
                        disabled={isLoading}
                      />
                      <span className="category-name">Analytics Cookies</span>
                    </label>
                  </div>
                  <p className="category-description">
                    Help us understand how you use our website to improve our services. 
                    All data is anonymized and used only for statistical purposes.
                  </p>
                  <div className="category-examples">
                    <strong>Examples:</strong> Page views, feature usage, session duration, error tracking
                  </div>
                </div>

                <div className="cookie-category">
                  <div className="category-header">
                    <label className="category-label">
                      <input
                        type="checkbox"
                        checked={preferences.marketing}
                        onChange={() => handlePreferenceChange('marketing')}
                        disabled={isLoading}
                      />
                      <span className="category-name">Marketing Cookies</span>
                    </label>
                  </div>
                  <p className="category-description">
                    Used to deliver personalized advertisements and measure their effectiveness. 
                    These may track you across websites.
                  </p>
                  <div className="category-examples">
                    <strong>Examples:</strong> Ad targeting, conversion tracking, social media integration
                  </div>
                </div>
              </div>

              <div className="cookie-actions">
                <button 
                  className="cookie-btn cookie-btn-secondary"
                  onClick={() => setShowDetails(false)}
                  disabled={isLoading}
                >
                  Back
                </button>
                <button 
                  className="cookie-btn cookie-btn-reject"
                  onClick={handleRejectAll}
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : 'Reject All'}
                </button>
                <button 
                  className="cookie-btn cookie-btn-primary"
                  onClick={handleAcceptSelected}
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>

              <div className="cookie-footer-links">
                <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">
                  Privacy Policy
                </a>
                <span className="separator">•</span>
                <a href="/cookie-policy" target="_blank" rel="noopener noreferrer">
                  Cookie Policy
                </a>
                <span className="separator">•</span>
                <button 
                  className="link-button"
                  onClick={() => {
                    const data = JSON.stringify(ConsentManager.exportUserData(), null, 2)
                    const blob = new Blob([data], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = 'my-cookie-data.json'
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    URL.revokeObjectURL(url)
                  }}
                >
                  Download My Data
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default CookieBanner