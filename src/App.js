import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AuthContainer from './components/AuthContainer/AuthContainer'
import Dashboard from './components/Dashboard/Dashboard'
import PasswordReset from './components/PasswordReset/PasswordReset'
import CookieBanner from './components/CookieBanner/CookieBanner'
import { CookieHelpers, AuthCookies, AnalyticsCookies, ConsentManager } from './utils/cookies'
import './App.css'

function AppContent() {
  const { user, loading } = useAuth()

  // Move initializeUserPreferences inside useEffect to avoid dependency warning
  useEffect(() => {
    const initializeUserPreferences = () => {
      // Check if this is a first-time user
      if (AuthCookies.isFirstTimeUser()) {
        CookieHelpers.initializeForNewUser()
      }
      
      // Apply theme preference if functional cookies are allowed
      const consent = ConsentManager.getConsentPreferences()
      if (consent.functional) {
        applyUserTheme()
      }
      
      // Track page load if analytics consented
      if (consent.analytics) {
        AnalyticsCookies.trackPageView(window.location.pathname)
        AnalyticsCookies.trackFeatureUsage('app_load')
      }
    }

    const applyUserTheme = () => {
      const theme = AuthCookies.getTheme()
      document.documentElement.setAttribute('data-theme', theme)
      
      // Also apply to meta theme-color for mobile browsers
      const metaTheme = document.querySelector('meta[name="theme-color"]')
      if (metaTheme) {
        metaTheme.setAttribute('content', theme === 'dark' ? '#1f2937' : '#ffffff')
      }
    }

    // Initialize cookies for new users or apply existing preferences
    initializeUserPreferences()
    
    // Listen for cookie preference updates
    const handleCookiePreferencesUpdate = (event) => {
      const preferences = event.detail
      
      // Apply theme if functional cookies are enabled
      if (preferences.functional) {
        applyUserTheme()
      }
      
      // Initialize analytics if consented
      if (preferences.analytics && !user) {
        AnalyticsCookies.startSession()
      }
    }

    window.addEventListener('cookiePreferencesUpdated', handleCookiePreferencesUpdate)
    
    return () => {
      window.removeEventListener('cookiePreferencesUpdated', handleCookiePreferencesUpdate)
    }
  }, [user]) // Only user dependency needed now

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <>
      <Router>
        <Routes>
          {/* Password reset route - accessible without authentication */}
          <Route path="/reset-password" element={<PasswordReset />} />
          
          {/* Protected routes */}
          <Route 
            path="/dashboard" 
            element={user ? <Dashboard /> : <Navigate to="/auth" />} 
          />
          
          {/* Auth routes */}
          <Route 
            path="/auth" 
            element={!user ? <AuthContainer /> : <Navigate to="/dashboard" />} 
          />
          
          {/* Default redirect */}
          <Route 
            path="/" 
            element={<Navigate to={user ? "/dashboard" : "/auth"} />} 
          />
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
      
      {/* Cookie Banner - Shows only if consent not given */}
      <CookieBanner />
    </>
  )
}

function App() {
  useEffect(() => {
    // Add theme meta tag if it doesn't exist
    if (!document.querySelector('meta[name="theme-color"]')) {
      const meta = document.createElement('meta')
      meta.name = 'theme-color'
      meta.content = '#ffffff'
      document.head.appendChild(meta)
    }
    
    // Initialize security fingerprinting
    const consent = ConsentManager.getConsentPreferences()
    if (consent.functional) {
      // Generate device fingerprint for security (only if functional cookies allowed)
      import('./utils/cookies').then(({ SecurityCookies }) => {
        SecurityCookies.generateDeviceFingerprint()
      })
    }
  }, [])

  return (
    <AuthProvider>
      <div className="App">
        <AppContent />
      </div>
    </AuthProvider>
  )
}

export default App