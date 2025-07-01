import React, { useState } from 'react'
import SignIn from '../SignIn/SignIn'
import SignUp from '../SignUp/SignUp'
import './AuthContainer.css'

const AuthContainer = () => {
  const [isSignUp, setIsSignUp] = useState(false)

  const toggleMode = () => {
    setIsSignUp(!isSignUp)
  }

  return (
    <div className="auth-container">
      <div className="auth-background">
        {/* Floating particles for IoT network effect */}
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <div className="logo-icon">🏠</div>
              <h1>SmartHub Pro</h1>
            </div>
            <p className="auth-subtitle">
              {isSignUp 
                ? 'Create your smart home control center' 
                : 'Welcome back to your connected home'
              }
            </p>
          </div>

          <div className="auth-content">
            {isSignUp ? <SignUp /> : <SignIn />}
          </div>

          <div className="auth-footer">
            <p>
              {isSignUp ? 'Already managing your smart home?' : "Ready to automate your home?"}{' '}
              <button 
                className="auth-toggle-btn" 
                onClick={toggleMode}
                type="button"
              >
                {isSignUp ? 'Sign in to dashboard' : 'Create smart home account'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthContainer