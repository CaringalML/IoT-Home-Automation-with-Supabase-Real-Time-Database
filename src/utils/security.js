// Security utility functions for the IoT application

/**
 * Validates if the current context is secure (HTTPS)
 */
export const validateSecureContext = () => {
  if (typeof window === 'undefined') return true

  const isSecure = window.isSecureContext || 
                   window.location.protocol === 'https:' || 
                   window.location.hostname === 'localhost' ||
                   window.location.hostname === '127.0.0.1'

  if (!isSecure && process.env.NODE_ENV === 'production') {
    console.error('⚠️ Insecure context detected in production')
    return false
  }

  return true
}

/**
 * Sanitizes user input to prevent XSS attacks
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Validates device ID format for security
 */
export const validateDeviceId = (deviceId) => {
  if (!deviceId) return false
  
  // Only allow alphanumeric characters, underscores, and hyphens
  const pattern = /^[A-Za-z0-9_-]{3,20}$/
  return pattern.test(deviceId)
}

/**
 * Generates a secure random string for device IDs
 */
export const generateSecureId = (length = 12) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  
  // Use crypto.getRandomValues for security if available
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(length)
    window.crypto.getRandomValues(array)
    
    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length]
    }
  } else {
    // Fallback for environments without crypto API
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)]
    }
  }
  
  return result
}

/**
 * Validates email format
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validates password strength
 */
export const validatePasswordStrength = (password) => {
  const requirements = {
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumbers: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  }

  const score = Object.values(requirements).filter(Boolean).length
  
  return {
    ...requirements,
    score,
    isStrong: score >= 4,
    strength: score < 2 ? 'weak' : score < 4 ? 'medium' : 'strong'
  }
}

/**
 * Rate limiting utility
 */
class RateLimiter {
  constructor(maxAttempts = 5, windowMs = 60000) {
    this.maxAttempts = maxAttempts
    this.windowMs = windowMs
    this.attempts = new Map()
  }

  isAllowed(key) {
    const now = Date.now()
    const userAttempts = this.attempts.get(key) || []
    
    // Remove old attempts outside the window
    const validAttempts = userAttempts.filter(time => now - time < this.windowMs)
    
    if (validAttempts.length >= this.maxAttempts) {
      return false
    }
    
    // Add current attempt
    validAttempts.push(now)
    this.attempts.set(key, validAttempts)
    
    return true
  }

  getRemainingTime(key) {
    const userAttempts = this.attempts.get(key) || []
    if (userAttempts.length < this.maxAttempts) return 0
    
    const oldestAttempt = Math.min(...userAttempts)
    const remainingTime = this.windowMs - (Date.now() - oldestAttempt)
    
    return Math.max(0, remainingTime)
  }
}

export const loginRateLimiter = new RateLimiter(5, 300000) // 5 attempts per 5 minutes

/**
 * Content Security Policy violation reporter
 */
export const reportCSPViolation = (violationEvent) => {
  if (process.env.REACT_APP_CSP_REPORT_URI) {
    fetch(process.env.REACT_APP_CSP_REPORT_URI, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        'csp-report': violationEvent
      })
    }).catch(err => console.error('Failed to report CSP violation:', err))
  }
}

/**
 * Secure localStorage wrapper with encryption
 */
export class SecureStorage {
  static encrypt(data) {
    try {
      // Simple XOR encryption for demo - use proper encryption in production
      const key = 'SmartHubProSecureKey2024'
      let encrypted = ''
      
      for (let i = 0; i < data.length; i++) {
        encrypted += String.fromCharCode(
          data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        )
      }
      
      return btoa(encrypted)
    } catch (error) {
      console.error('Encryption failed:', error)
      return data
    }
  }

  static decrypt(encryptedData) {
    try {
      const data = atob(encryptedData)
      const key = 'SmartHubProSecureKey2024'
      let decrypted = ''
      
      for (let i = 0; i < data.length; i++) {
        decrypted += String.fromCharCode(
          data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        )
      }
      
      return decrypted
    } catch (error) {
      console.error('Decryption failed:', error)
      return encryptedData
    }
  }

  static setItem(key, value) {
    if (typeof window === 'undefined') return
    
    try {
      const encrypted = this.encrypt(JSON.stringify(value))
      localStorage.setItem(key, encrypted)
    } catch (error) {
      console.error('Secure storage set failed:', error)
    }
  }

  static getItem(key) {
    if (typeof window === 'undefined') return null
    
    try {
      const encrypted = localStorage.getItem(key)
      if (!encrypted) return null
      
      const decrypted = this.decrypt(encrypted)
      return JSON.parse(decrypted)
    } catch (error) {
      console.error('Secure storage get failed:', error)
      return null
    }
  }

  static removeItem(key) {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error('Secure storage remove failed:', error)
    }
  }
}

/**
 * Security event logger
 */
export const logSecurityEvent = (event, details = {}) => {
  const securityEvent = {
    timestamp: new Date().toISOString(),
    event,
    details,
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
    url: typeof window !== 'undefined' ? window.location.href : 'unknown'
  }

  console.log('🛡️ Security Event:', securityEvent)
  
  // In production, you might want to send this to a security monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to monitoring service
    // sendToSecurityMonitoring(securityEvent)
  }
}

/**
 * Initialize security features
 */
export const initializeSecurity = () => {
  if (typeof window === 'undefined') return

  // Validate secure context
  if (!validateSecureContext()) {
    logSecurityEvent('insecure_context_detected')
  }

  // Set up CSP violation reporting
  document.addEventListener('securitypolicyviolation', (e) => {
    logSecurityEvent('csp_violation', {
      blockedURI: e.blockedURI,
      violatedDirective: e.violatedDirective,
      originalPolicy: e.originalPolicy
    })
    reportCSPViolation(e)
  })

  // Disable right-click context menu in production
  if (process.env.NODE_ENV === 'production') {
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      return false
    })
  }

  // Disable F12 and other dev tools shortcuts in production
  if (process.env.NODE_ENV === 'production') {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'F12' || 
          (e.ctrlKey && e.shiftKey && e.key === 'I') ||
          (e.ctrlKey && e.shiftKey && e.key === 'C') ||
          (e.ctrlKey && e.shiftKey && e.key === 'J')) {
        e.preventDefault()
        return false
      }
    })
  }

  logSecurityEvent('security_initialized')
}

// Export all security utilities
export default {
  validateSecureContext,
  sanitizeInput,
  validateDeviceId,
  generateSecureId,
  validateEmail,
  validatePasswordStrength,
  loginRateLimiter,
  reportCSPViolation,
  SecureStorage,
  logSecurityEvent,
  initializeSecurity
}