import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AuthContainer from './components/AuthContainer/AuthContainer'
import Dashboard from './components/Dashboard/Dashboard'
import PasswordReset from './components/PasswordReset/PasswordReset'
import './App.css'

// Security utilities with safe fallbacks
const initializeSecurity = () => {
  console.log('🛡️ Security features initialized')
}

const logSecurityEvent = (event, details = {}) => {
  console.log('🛡️ Security Event:', event, details)
}

const validateSecureContext = () => {
  if (typeof window === 'undefined') return true
  return window.isSecureContext || 
         window.location.protocol === 'https:' || 
         window.location.hostname === 'localhost' ||
         window.location.hostname === '127.0.0.1'
}

function AppContent() {
  const { user, loading } = useAuth()

  useEffect(() => {
    // Initialize security features
    initializeSecurity()
    
    // Validate secure context
    if (!validateSecureContext()) {
      console.warn('⚠️ Application is not running in a secure context')
      logSecurityEvent('insecure_context_warning', {
        protocol: window.location.protocol,
        hostname: window.location.hostname
      })
    }
    
    // Add theme meta tag if it doesn't exist
    if (!document.querySelector('meta[name="theme-color"]')) {
      const meta = document.createElement('meta')
      meta.name = 'theme-color'
      meta.content = '#0f172a'
      document.head.appendChild(meta)
    }

    // Add viewport meta tag if it doesn't exist (for mobile)
    if (!document.querySelector('meta[name="viewport"]')) {
      const viewport = document.createElement('meta')
      viewport.name = 'viewport'
      viewport.content = 'width=device-width, initial-scale=1, shrink-to-fit=no'
      document.head.appendChild(viewport)
    }

    // Log application start
    logSecurityEvent('application_started', {
      version: '1.0.0',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    })

    // Set up error boundary for uncaught errors
    const handleUnhandledError = (event) => {
      console.error('Unhandled error:', event.error)
      logSecurityEvent('unhandled_error', {
        message: event.error?.message,
        stack: event.error?.stack,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      })
    }

    const handleUnhandledRejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason)
      logSecurityEvent('unhandled_promise_rejection', {
        reason: event.reason?.toString(),
        stack: event.reason?.stack
      })
    }

    // Add global error handlers
    window.addEventListener('error', handleUnhandledError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    // Set up online/offline detection
    const handleOnline = () => {
      logSecurityEvent('connection_restored')
      console.log('🌐 Connection restored')
    }

    const handleOffline = () => {
      logSecurityEvent('connection_lost')
      console.warn('🌐 Connection lost')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Cleanup function
    return () => {
      window.removeEventListener('error', handleUnhandledError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Log user authentication state changes
  useEffect(() => {
    if (!loading) {
      if (user) {
        logSecurityEvent('user_authenticated', {
          userId: user.id,
          email: user.email,
          provider: user.app_metadata?.provider
        })
      } else {
        logSecurityEvent('user_unauthenticated')
      }
    }
  }, [user, loading])

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Initializing SmartHub Pro...</p>
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        {/* Password reset route - accessible without authentication */}
        <Route path="/reset-password" element={<PasswordReset />} />
        
        {/* Protected routes */}
        <Route 
          path="/dashboard" 
          element={user ? <Dashboard /> : <Navigate to="/auth" replace />} 
        />
        
        {/* Auth routes */}
        <Route 
          path="/auth" 
          element={!user ? <AuthContainer /> : <Navigate to="/dashboard" replace />} 
        />
        
        {/* Default redirect */}
        <Route 
          path="/" 
          element={<Navigate to={user ? "/dashboard" : "/auth"} replace />} 
        />
        
        {/* Catch all route - redirect to appropriate page */}
        <Route 
          path="*" 
          element={<Navigate to={user ? "/dashboard" : "/auth"} replace />} 
        />
      </Routes>
    </Router>
  )
}

function App() {
  // App-level security and performance monitoring
  useEffect(() => {
    // Monitor performance
    if ('performance' in window && 'getEntriesByType' in performance) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const paintEntries = performance.getEntriesByType('paint')
          const navigationEntries = performance.getEntriesByType('navigation')
          
          if (paintEntries.length > 0 && navigationEntries.length > 0) {
            const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint')
            const navigation = navigationEntries[0]
            
            logSecurityEvent('performance_metrics', {
              firstContentfulPaint: fcp?.startTime,
              domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart,
              loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart,
              totalLoadTime: navigation?.loadEventEnd - navigation?.fetchStart
            })
          }
        }, 0)
      })
    }

    // Monitor memory usage (if available)
    if ('memory' in performance) {
      const checkMemory = () => {
        const memory = performance.memory
        logSecurityEvent('memory_usage', {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
          timestamp: new Date().toISOString()
        })
      }

      // Check memory every 5 minutes
      const memoryInterval = setInterval(checkMemory, 5 * 60 * 1000)
      
      return () => clearInterval(memoryInterval)
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