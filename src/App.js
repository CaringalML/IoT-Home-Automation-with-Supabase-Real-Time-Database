import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AuthContainer from './components/AuthContainer/AuthContainer'
import Dashboard from './components/Dashboard/Dashboard'
import PasswordReset from './components/PasswordReset/PasswordReset'
import './App.css'

function AppContent() {
  const { user, loading } = useAuth()

  useEffect(() => {
    // Add theme meta tag if it doesn't exist
    if (!document.querySelector('meta[name="theme-color"]')) {
      const meta = document.createElement('meta')
      meta.name = 'theme-color'
      meta.content = '#ffffff'
      document.head.appendChild(meta)
    }
  }, [])

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
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
  )
}

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <AppContent />
      </div>
    </AuthProvider>
  )
}

export default App