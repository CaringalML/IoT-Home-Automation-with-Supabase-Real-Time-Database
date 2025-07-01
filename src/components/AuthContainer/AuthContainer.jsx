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
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <div className="logo-icon">🔥</div>
              <h1>Firebase Clone</h1>
            </div>
            <p className="auth-subtitle">
              {isSignUp ? 'Create your account' : 'Sign in to your account'}
            </p>
          </div>

          <div className="auth-content">
            {isSignUp ? <SignUp /> : <SignIn />}
          </div>

          <div className="auth-footer">
            <p>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button 
                className="auth-toggle-btn" 
                onClick={toggleMode}
                type="button"
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthContainer