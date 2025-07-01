import React from 'react'
import { useAuth } from '../../contexts/AuthContext'
import './Dashboard.css'

const Dashboard = () => {
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="dashboard-logo">
          <div className="logo-icon">🔥</div>
          <h1>Firebase Clone</h1>
        </div>
        <button onClick={handleSignOut} className="signout-btn">
          Sign out
        </button>
      </div>

      <div className="dashboard-content">
        <div className="welcome-card">
          <div className="welcome-header">
            <h2>Welcome back!</h2>
            <div className="user-avatar">
              {user?.user_metadata?.full_name?.charAt(0)?.toUpperCase() || 
               user?.email?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </div>
          
          <div className="user-info">
            <div className="info-item">
              <span className="info-label">Full Name:</span>
              <span className="info-value">
                {user?.user_metadata?.full_name || 'Not provided'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Email:</span>
              <span className="info-value">{user?.email}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Account Status:</span>
              <span className={`status-badge ${user?.email_confirmed_at ? 'verified' : 'unverified'}`}>
                {user?.email_confirmed_at ? 'Verified' : 'Unverified'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Member Since:</span>
              <span className="info-value">
                {new Date(user?.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Analytics</h3>
            <p>View your account analytics and usage statistics.</p>
            <button className="feature-btn">View Analytics</button>
          </div>

          <div className="feature-card">
            <div className="feature-icon">⚙️</div>
            <h3>Settings</h3>
            <p>Manage your account settings and preferences.</p>
            <button className="feature-btn">Open Settings</button>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>Security</h3>
            <p>Configure security settings and two-factor authentication.</p>
            <button className="feature-btn">Security Settings</button>
          </div>

          <div className="feature-card">
            <div className="feature-icon">💬</div>
            <h3>Support</h3>
            <p>Get help and contact our support team.</p>
            <button className="feature-btn">Contact Support</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard