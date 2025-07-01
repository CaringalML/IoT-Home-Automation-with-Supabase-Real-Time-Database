/**
 * Production-ready cookie utilities for React Supabase Auth
 * Features: GDPR compliance, security, analytics, user preferences
 */

// Core cookie utilities
export const CookieUtils = {
  // Set a cookie with comprehensive security options
  set: (name, value, options = {}) => {
    if (!CookieUtils.isEnabled()) {
      console.warn('Cookies are disabled in this browser')
      return false
    }

    const defaults = {
      expires: 30, // days
      secure: window.location.protocol === 'https:',
      sameSite: 'strict',
      path: '/'
    }
    
    const settings = { ...defaults, ...options }
    
    try {
      let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(JSON.stringify(value))}`
      
      if (settings.expires) {
        const date = new Date()
        date.setTime(date.getTime() + (settings.expires * 24 * 60 * 60 * 1000))
        cookieString += `; expires=${date.toUTCString()}`
      }
      
      if (settings.path) cookieString += `; path=${settings.path}`
      if (settings.domain) cookieString += `; domain=${settings.domain}`
      if (settings.secure) cookieString += `; secure`
      if (settings.sameSite) cookieString += `; samesite=${settings.sameSite}`
      if (settings.httpOnly) cookieString += `; httponly`
      
      document.cookie = cookieString
      return true
    } catch (error) {
      console.error('Error setting cookie:', error)
      return false
    }
  },

  // Get a cookie value with error handling
  get: (name) => {
    if (!CookieUtils.isEnabled()) return null

    try {
      const nameEQ = encodeURIComponent(name) + "="
      const ca = document.cookie.split(';')
      
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i]
        while (c.charAt(0) === ' ') c = c.substring(1, c.length)
        if (c.indexOf(nameEQ) === 0) {
          const value = c.substring(nameEQ.length, c.length)
          try {
            return JSON.parse(decodeURIComponent(value))
          } catch {
            return decodeURIComponent(value)
          }
        }
      }
      return null
    } catch (error) {
      console.error('Error getting cookie:', error)
      return null
    }
  },

  // Remove a cookie securely
  remove: (name, path = '/', domain = null) => {
    try {
      let cookieString = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}`
      if (domain) cookieString += `; domain=${domain}`
      document.cookie = cookieString
      return true
    } catch (error) {
      console.error('Error removing cookie:', error)
      return false
    }
  },

  // Check if cookies are enabled
  isEnabled: () => {
    try {
      const testName = '__cookie_test__'
      document.cookie = `${testName}=test; path=/`
      const enabled = document.cookie.indexOf(testName) !== -1
      CookieUtils.remove(testName)
      return enabled
    } catch {
      return false
    }
  },

  // Get all cookies
  getAll: () => {
    if (!CookieUtils.isEnabled()) return {}

    const cookies = {}
    try {
      document.cookie.split(';').forEach(cookie => {
        const [name, value] = cookie.trim().split('=')
        if (name && value) {
          cookies[decodeURIComponent(name)] = CookieUtils.get(decodeURIComponent(name))
        }
      })
    } catch (error) {
      console.error('Error getting all cookies:', error)
    }
    return cookies
  },

  // Clear all cookies (for logout/reset)
  clearAll: (exceptions = []) => {
    const cookies = CookieUtils.getAll()
    Object.keys(cookies).forEach(name => {
      if (!exceptions.includes(name)) {
        CookieUtils.remove(name)
      }
    })
  }
}

// Authentication-related cookies
export const AuthCookies = {
  // Remember email for sign-in (90 days)
  setRememberedEmail: (email) => {
    return CookieUtils.set('auth_remembered_email', email, { 
      expires: 90,
      secure: true,
      sameSite: 'strict'
    })
  },

  getRememberedEmail: () => {
    return CookieUtils.get('auth_remembered_email')
  },

  clearRememberedEmail: () => {
    return CookieUtils.remove('auth_remembered_email')
  },

  // Theme preferences (1 year)
  setTheme: (theme) => {
    const validThemes = ['light', 'dark', 'auto']
    if (!validThemes.includes(theme)) {
      console.warn('Invalid theme value:', theme)
      return false
    }
    return CookieUtils.set('user_theme', theme, { expires: 365 })
  },

  getTheme: () => {
    return CookieUtils.get('user_theme') || 'light'
  },

  // Language preferences (1 year)
  setLanguage: (lang) => {
    const validLangs = ['en', 'es', 'fr', 'de', 'zh', 'ja']
    if (!validLangs.includes(lang)) {
      console.warn('Invalid language value:', lang)
      return false
    }
    return CookieUtils.set('user_language', lang, { expires: 365 })
  },

  getLanguage: () => {
    return CookieUtils.get('user_language') || 'en'
  },

  // Dashboard layout preferences (6 months)
  setDashboardLayout: (layout) => {
    if (typeof layout !== 'object') {
      console.warn('Dashboard layout must be an object')
      return false
    }
    return CookieUtils.set('dashboard_layout', layout, { expires: 180 })
  },

  getDashboardLayout: () => {
    return CookieUtils.get('dashboard_layout') || {
      sidebar: 'expanded',
      widgets: ['welcome', 'analytics', 'settings'],
      gridSize: 'medium'
    }
  },

  // First-time user flag (1 year)
  setFirstTimeUser: (isFirstTime) => {
    return CookieUtils.set('first_time_user', isFirstTime, { expires: 365 })
  },

  isFirstTimeUser: () => {
    const value = CookieUtils.get('first_time_user')
    return value !== false
  },

  markAsReturningUser: () => {
    return CookieUtils.set('first_time_user', false, { expires: 365 })
  },

  // User preferences bundle
  setUserPreferences: (preferences) => {
    const validPrefs = {
      theme: preferences.theme || 'light',
      language: preferences.language || 'en',
      notifications: preferences.notifications !== false,
      emailUpdates: preferences.emailUpdates !== false,
      dashboardLayout: preferences.dashboardLayout || {}
    }
    return CookieUtils.set('user_preferences', validPrefs, { expires: 365 })
  },

  getUserPreferences: () => {
    return CookieUtils.get('user_preferences') || {
      theme: 'light',
      language: 'en',
      notifications: true,
      emailUpdates: true,
      dashboardLayout: {}
    }
  }
}

// Security-related cookies
export const SecurityCookies = {
  // Device fingerprint for security (1 year)
  setDeviceFingerprint: (fingerprint) => {
    if (!fingerprint || typeof fingerprint !== 'string') {
      console.warn('Invalid device fingerprint')
      return false
    }
    return CookieUtils.set('device_fingerprint', fingerprint, { 
      expires: 365,
      secure: true,
      sameSite: 'strict'
    })
  },

  getDeviceFingerprint: () => {
    return CookieUtils.get('device_fingerprint')
  },

  // Generate device fingerprint
  generateDeviceFingerprint: () => {
    try {
      const fingerprint = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screen: `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timestamp: Date.now()
      }
      
      // Create a simple hash
      const hash = btoa(JSON.stringify(fingerprint))
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 32)
      
      SecurityCookies.setDeviceFingerprint(hash)
      return hash
    } catch (error) {
      console.error('Error generating fingerprint:', error)
      return null
    }
  },

  // Last login timestamp (30 days)
  setLastLogin: () => {
    return CookieUtils.set('last_login', new Date().toISOString(), { expires: 30 })
  },

  getLastLogin: () => {
    return CookieUtils.get('last_login')
  },

  // Failed login attempts tracking (1 day)
  incrementFailedAttempts: () => {
    const attempts = SecurityCookies.getFailedAttempts()
    return CookieUtils.set('failed_attempts', attempts + 1, { expires: 1 })
  },

  getFailedAttempts: () => {
    return CookieUtils.get('failed_attempts') || 0
  },

  clearFailedAttempts: () => {
    return CookieUtils.remove('failed_attempts')
  },

  // Suspicious activity tracking
  flagSuspiciousActivity: (reason) => {
    const flags = SecurityCookies.getSuspiciousFlags()
    flags.push({
      reason,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    })
    
    // Keep only last 10 flags
    if (flags.length > 10) {
      flags.splice(0, flags.length - 10)
    }
    
    return CookieUtils.set('security_flags', flags, { expires: 7 })
  },

  getSuspiciousFlags: () => {
    return CookieUtils.get('security_flags') || []
  },

  clearSuspiciousFlags: () => {
    return CookieUtils.remove('security_flags')
  }
}

// Analytics cookies (with consent management)
export const AnalyticsCookies = {
  // User consent for analytics (1 year)
  setAnalyticsConsent: (consent) => {
    return CookieUtils.set('analytics_consent', consent, { expires: 365 })
  },

  hasAnalyticsConsent: () => {
    return CookieUtils.get('analytics_consent') === true
  },

  // Session tracking
  startSession: () => {
    if (!AnalyticsCookies.hasAnalyticsConsent()) return false
    
    const sessionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const sessionData = {
      id: sessionId,
      start: new Date().toISOString(),
      pageViews: 1,
      events: []
    }
    
    return CookieUtils.set('session_data', sessionData, { expires: 1 })
  },

  getSessionData: () => {
    if (!AnalyticsCookies.hasAnalyticsConsent()) return null
    return CookieUtils.get('session_data')
  },

  updateSession: (data) => {
    if (!AnalyticsCookies.hasAnalyticsConsent()) return false
    
    const session = AnalyticsCookies.getSessionData()
    if (!session) return false
    
    const updatedSession = { ...session, ...data }
    return CookieUtils.set('session_data', updatedSession, { expires: 1 })
  },

  // Feature usage tracking
  trackFeatureUsage: (feature) => {
    if (!AnalyticsCookies.hasAnalyticsConsent()) return false
    
    const usage = AnalyticsCookies.getFeatureUsage()
    usage[feature] = (usage[feature] || 0) + 1
    usage.lastUpdated = new Date().toISOString()
    
    return CookieUtils.set('feature_usage', usage, { expires: 30 })
  },

  getFeatureUsage: () => {
    if (!AnalyticsCookies.hasAnalyticsConsent()) return {}
    return CookieUtils.get('feature_usage') || {}
  },

  // Page view tracking
  trackPageView: (path) => {
    if (!AnalyticsCookies.hasAnalyticsConsent()) return false
    
    const session = AnalyticsCookies.getSessionData()
    if (session) {
      session.pageViews = (session.pageViews || 0) + 1
      session.lastPage = path
      session.lastActivity = new Date().toISOString()
      AnalyticsCookies.updateSession(session)
    }
    
    // Track in page views cookie
    const pageViews = AnalyticsCookies.getPageViews()
    pageViews[path] = (pageViews[path] || 0) + 1
    return CookieUtils.set('page_views', pageViews, { expires: 30 })
  },

  getPageViews: () => {
    if (!AnalyticsCookies.hasAnalyticsConsent()) return {}
    return CookieUtils.get('page_views') || {}
  },

  // Custom event tracking
  trackEvent: (eventName, eventData = {}) => {
    if (!AnalyticsCookies.hasAnalyticsConsent()) return false
    
    const event = {
      name: eventName,
      data: eventData,
      timestamp: new Date().toISOString()
    }
    
    // Add to session events
    const session = AnalyticsCookies.getSessionData()
    if (session) {
      session.events = session.events || []
      session.events.push(event)
      
      // Keep only last 50 events per session
      if (session.events.length > 50) {
        session.events.splice(0, session.events.length - 50)
      }
      
      AnalyticsCookies.updateSession(session)
    }
    
    return true
  }
}

// Cookie consent management
export const ConsentManager = {
  // Cookie consent preferences
  setConsentPreferences: (preferences) => {
    const validPrefs = {
      necessary: true, // Always true
      functional: preferences.functional === true,
      analytics: preferences.analytics === true,
      marketing: preferences.marketing === true,
      timestamp: new Date().toISOString()
    }
    
    // Set analytics consent specifically
    AnalyticsCookies.setAnalyticsConsent(validPrefs.analytics)
    
    return CookieUtils.set('cookie_consent_preferences', validPrefs, { expires: 365 })
  },

  getConsentPreferences: () => {
    return CookieUtils.get('cookie_consent_preferences') || {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
      timestamp: null
    }
  },

  hasGivenConsent: () => {
    const prefs = ConsentManager.getConsentPreferences()
    return prefs.timestamp !== null
  },

  // Check if specific cookie type is allowed
  isAllowed: (type) => {
    const prefs = ConsentManager.getConsentPreferences()
    return prefs[type] === true
  },

  // Clear all non-necessary cookies
  clearNonEssentialCookies: () => {
    const essentialCookies = [
      'cookie_consent_preferences',
      'auth_remembered_email', // Keep if user wants
      'user_theme', // Keep for UX
      'user_language' // Keep for UX
    ]
    
    const allCookies = CookieUtils.getAll()
    Object.keys(allCookies).forEach(name => {
      if (!essentialCookies.includes(name)) {
        CookieUtils.remove(name)
      }
    })
  },

  // Export user data (GDPR compliance)
  exportUserData: () => {
    return {
      cookies: CookieUtils.getAll(),
      consent: ConsentManager.getConsentPreferences(),
      analytics: AnalyticsCookies.hasAnalyticsConsent() ? {
        sessionData: AnalyticsCookies.getSessionData(),
        featureUsage: AnalyticsCookies.getFeatureUsage(),
        pageViews: AnalyticsCookies.getPageViews()
      } : null,
      security: {
        deviceFingerprint: SecurityCookies.getDeviceFingerprint(),
        lastLogin: SecurityCookies.getLastLogin(),
        suspiciousFlags: SecurityCookies.getSuspiciousFlags()
      },
      preferences: AuthCookies.getUserPreferences(),
      exportDate: new Date().toISOString()
    }
  }
}

// Utility functions for common operations
export const CookieHelpers = {
  // Initialize cookies for new user
  initializeForNewUser: () => {
    AuthCookies.setFirstTimeUser(true)
    SecurityCookies.generateDeviceFingerprint()
    
    // Set default preferences
    AuthCookies.setUserPreferences({
      theme: 'light',
      language: navigator.language.split('-')[0] || 'en',
      notifications: true,
      emailUpdates: true
    })
  },

  // Clean up cookies on logout
  cleanupOnLogout: () => {
    const keepCookies = [
      'cookie_consent_preferences',
      'user_theme',
      'user_language',
      'auth_remembered_email' // Only if user chose to remember
    ]
    
    CookieUtils.clearAll(keepCookies)
    SecurityCookies.clearFailedAttempts()
    SecurityCookies.setLastLogin()
  },

  // Check for suspicious activity
  checkSecurity: () => {
    const failedAttempts = SecurityCookies.getFailedAttempts()
    const suspiciousFlags = SecurityCookies.getSuspiciousFlags()
    
    return {
      failedAttempts,
      suspiciousFlags,
      isHighRisk: failedAttempts >= 5 || suspiciousFlags.length >= 3
    }
  },

  // Get user analytics summary
  getAnalyticsSummary: () => {
    if (!AnalyticsCookies.hasAnalyticsConsent()) {
      return { error: 'Analytics consent not given' }
    }
    
    return {
      session: AnalyticsCookies.getSessionData(),
      featureUsage: AnalyticsCookies.getFeatureUsage(),
      pageViews: AnalyticsCookies.getPageViews()
    }
  }
}

// Default export object assigned to a variable
const CookieManager = {
  CookieUtils,
  AuthCookies,
  SecurityCookies,
  AnalyticsCookies,
  ConsentManager,
  CookieHelpers
}

export default CookieManager