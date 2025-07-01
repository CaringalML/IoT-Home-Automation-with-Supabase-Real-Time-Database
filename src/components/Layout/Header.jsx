import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import './Header.css'

const Header = ({ onAddDevice, deviceStats = {}, showMobileMenu, setShowMobileMenu }) => {
  const { user, signOut } = useAuth()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('online')

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  // Simulate connection status monitoring
  useEffect(() => {
    const checkConnection = () => {
      setConnectionStatus(navigator.onLine ? 'online' : 'offline')
    }
    
    window.addEventListener('online', checkConnection)
    window.addEventListener('offline', checkConnection)
    
    return () => {
      window.removeEventListener('online', checkConnection)
      window.removeEventListener('offline', checkConnection)
    }
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    })
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric' 
    })
  }

  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const mockNotifications = [
    { id: 1, type: 'device', message: 'Living Room Light is offline', time: '5m ago', priority: 'high' },
    { id: 2, type: 'security', message: 'Front Door unlocked', time: '12m ago', priority: 'medium' },
    { id: 3, type: 'energy', message: 'Energy usage 15% below average', time: '1h ago', priority: 'low' }
  ]

  return (
    <header className="console-header">
      <div className="header-left">
        <button 
          className="mobile-menu-btn"
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          aria-label="Toggle menu"
        >
          <span className="hamburger"></span>
        </button>
        
        <div className="brand-section">
          <div className="logo-container">
            <div className="logo-icon">🏠</div>
            <div className="brand-info">
              <h1 className="brand-title">SmartHub Pro</h1>
              <span className="brand-subtitle">IoT Control Center</span>
            </div>
          </div>
        </div>

        <div className="connection-status">
          <div className={`status-indicator ${connectionStatus}`}>
            <span className="status-dot"></span>
            <span className="status-text">{connectionStatus}</span>
          </div>
        </div>
      </div>

      <div className="header-center">
        <div className="quick-stats">
          <div className="stat-item">
            <span className="stat-icon">📊</span>
            <div className="stat-info">
              <span className="stat-number">{deviceStats.total || 0}</span>
              <span className="stat-label">Devices</span>
            </div>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <span className="stat-icon">🟢</span>
            <div className="stat-info">
              <span className="stat-number">{deviceStats.online || 0}</span>
              <span className="stat-label">Online</span>
            </div>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <span className="stat-icon">💡</span>
            <div className="stat-info">
              <span className="stat-number">{deviceStats.active || 0}</span>
              <span className="stat-label">Active</span>
            </div>
          </div>
        </div>
      </div>

      <div className="header-right">
        <div className="time-section">
          <div className="current-time">{formatTime(currentTime)}</div>
          <div className="current-date">{formatDate(currentTime)}</div>
        </div>

        <div className="header-actions">
          <button 
            className="action-btn add-device-btn"
            onClick={onAddDevice}
            title="Add New Device"
          >
            <span className="btn-icon">📱</span>
            <span className="btn-text">Add Device</span>
          </button>

          <div className="notifications-container">
            <button 
              className={`action-btn notifications-btn ${showNotifications ? 'active' : ''}`}
              onClick={() => setShowNotifications(!showNotifications)}
              title="Notifications"
            >
              <span className="btn-icon">🔔</span>
              <span className="notification-badge">3</span>
            </button>

            {showNotifications && (
              <div className="notifications-dropdown">
                <div className="dropdown-header">
                  <h3>Notifications</h3>
                  <button className="clear-all-btn">Clear All</button>
                </div>
                <div className="notifications-list">
                  {mockNotifications.map(notification => (
                    <div key={notification.id} className={`notification-item ${notification.priority}`}>
                      <div className="notification-content">
                        <span className="notification-message">{notification.message}</span>
                        <span className="notification-time">{notification.time}</span>
                      </div>
                      <button className="dismiss-btn">×</button>
                    </div>
                  ))}
                </div>
                <div className="dropdown-footer">
                  <button className="view-all-btn">View All Notifications</button>
                </div>
              </div>
            )}
          </div>

          <div className="user-menu-container">
            <button 
              className={`action-btn user-menu-btn ${showUserMenu ? 'active' : ''}`}
              onClick={() => setShowUserMenu(!showUserMenu)}
              title="User Menu"
            >
              <div className="user-avatar">
                <span className="avatar-icon">👤</span>
              </div>
              <div className="user-info">
                <span className="greeting">{getGreeting()}</span>
                <span className="user-name">{user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}</span>
              </div>
              <span className="dropdown-arrow">▼</span>
            </button>

            {showUserMenu && (
              <div className="user-dropdown">
                <div className="dropdown-header">
                  <div className="user-details">
                    <div className="user-avatar-large">
                      <span className="avatar-icon">👤</span>
                    </div>
                    <div className="user-text">
                      <span className="user-name-large">{user?.user_metadata?.full_name || 'Smart Home User'}</span>
                      <span className="user-email">{user?.email}</span>
                    </div>
                  </div>
                </div>
                <div className="dropdown-menu">
                  <button className="menu-item">
                    <span className="menu-icon">👤</span>
                    <span>Profile Settings</span>
                  </button>
                  <button className="menu-item">
                    <span className="menu-icon">🏠</span>
                    <span>Home Settings</span>
                  </button>
                  <button className="menu-item">
                    <span className="menu-icon">🔒</span>
                    <span>Security</span>
                  </button>
                  <button className="menu-item">
                    <span className="menu-icon">📊</span>
                    <span>Analytics</span>
                  </button>
                  <div className="menu-divider"></div>
                  <button className="menu-item">
                    <span className="menu-icon">❓</span>
                    <span>Help & Support</span>
                  </button>
                  <button className="menu-item logout-item" onClick={handleSignOut}>
                    <span className="menu-icon">🚪</span>
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Click outside to close menus */}
      {(showUserMenu || showNotifications) && (
        <div 
          className="overlay" 
          onClick={() => {
            setShowUserMenu(false)
            setShowNotifications(false)
          }}
        ></div>
      )}
    </header>
  )
}

export default Header