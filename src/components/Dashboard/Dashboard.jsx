import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import Header from '../Layout/Header'
import './Dashboard.css'

// Import HeartbeatService and utilities
const HeartbeatService = {
  // Placeholder for HeartbeatService - we'll implement this inline for now
  startService: () => {
    console.log('💓 Heartbeat service started')
    // Start checking for offline devices every minute
    setInterval(async () => {
      try {
        await supabase.rpc('mark_offline_devices')
        console.log('🔍 Offline check completed')
      } catch (error) {
        console.error('❌ Offline check failed:', error)
      }
    }, 60000) // Every 60 seconds
  },
  
  stopService: () => {
    console.log('⏹️ Heartbeat service stopped')
  },
  
  forceHeartbeat: async (deviceId) => {
    try {
      const { data, error } = await supabase.rpc('update_device_heartbeat', {
        device_id_param: deviceId
      })
      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('❌ Force heartbeat failed:', error)
      return { success: false, error }
    }
  },
  
  getHeartbeatStats: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('is_online, last_heartbeat')
        .eq('user_id', userId)

      if (error) throw error

      const now = new Date()
      let onlineCount = 0
      let staleCount = 0
      let offlineCount = 0

      data.forEach(device => {
        const lastHeartbeat = new Date(device.last_heartbeat)
        const secondsSinceHeartbeat = Math.floor((now - lastHeartbeat) / 1000)

        if (device.is_online) {
          if (secondsSinceHeartbeat <= 120) {
            onlineCount++
          } else {
            staleCount++
          }
        } else {
          offlineCount++
        }
      })

      const stats = {
        total: data.length,
        online: onlineCount,
        stale: staleCount,
        offline: offlineCount,
        healthyPercentage: data.length > 0 ? Math.round((onlineCount / data.length) * 100) : 0
      }

      return { success: true, data: stats }
    } catch (err) {
      console.error('Exception in getHeartbeatStats:', err)
      return { success: false, error: err }
    }
  },

  onHeartbeatEvent: (callback) => {
    // Simple event system for now
    return () => {}
  },

  isServiceHealthy: () => ({
    isRunning: true,
    intervalActive: true,
    callbacksRegistered: 0,
    lastCheck: new Date()
  }),

  getConfig: () => ({
    offlineCheckInterval: 60000,
    heartbeatTimeout: 120000,
    isRunning: true
  })
}

// HeartbeatUtils for formatting
const HeartbeatUtils = {
  formatTimeSinceHeartbeat: (seconds) => {
    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  },

  getHeartbeatStatusColor: (secondsSinceHeartbeat, isOnline) => {
    if (!isOnline) return '#ef4444' // red
    if (secondsSinceHeartbeat <= 60) return '#22c55e' // green
    if (secondsSinceHeartbeat <= 120) return '#f59e0b' // yellow
    return '#ef4444' // red
  },

  getHeartbeatStatusText: (secondsSinceHeartbeat, isOnline) => {
    if (!isOnline) return 'Offline'
    if (secondsSinceHeartbeat <= 60) return 'Online'
    if (secondsSinceHeartbeat <= 120) return 'Stale'
    return 'Offline'
  },

  getHeartbeatIcon: (secondsSinceHeartbeat, isOnline) => {
    if (!isOnline) return '🔴'
    if (secondsSinceHeartbeat <= 60) return '🟢'
    if (secondsSinceHeartbeat <= 120) return '🟡'
    return '🔴'
  },

  needsAttention: (secondsSinceHeartbeat, isOnline) => {
    return !isOnline || secondsSinceHeartbeat > 120
  }
}

const Dashboard = () => {
  const { user } = useAuth()
  
  // State variables
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddDevice, setShowAddDevice] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [showDeviceLogs, setShowDeviceLogs] = useState(false)
  const [deviceLogs, setDeviceLogs] = useState([])
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [activeView, setActiveView] = useState('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterLocation, setFilterLocation] = useState('all')
  const [togglingDeviceId, setTogglingDeviceId] = useState(null)
  
  // Refs for cleanup
  const toggleTimeoutRef = useRef(null)
  const heartbeatIntervalRef = useRef(null)

  // Form states
  const [deviceForm, setDeviceForm] = useState({
    device_id: '',
    device_name: '',
    device_type: 'light',
    location: '',
    qr_code: ''
  })
  
  // Statistics with heartbeat info
  const [stats, setStats] = useState({
    total: 0,
    online: 0,
    active: 0,
    offline: 0,
    stale: 0,
    byType: {},
    byLocation: {}
  })

  // Update stats function with heartbeat calculation
  const updateStats = useCallback((deviceList) => {
    const now = new Date()
    let staleCount = 0
    
    // Calculate stale devices (online but no recent heartbeat)
    deviceList.forEach(device => {
      if (device.is_online && device.last_heartbeat) {
        const lastHeartbeat = new Date(device.last_heartbeat)
        const secondsSinceHeartbeat = Math.floor((now - lastHeartbeat) / 1000)
        if (secondsSinceHeartbeat > 120) { // More than 2 minutes
          staleCount++
        }
      }
    })

    const newStats = {
      total: deviceList.length,
      online: deviceList.filter(d => d.is_online).length,
      active: deviceList.filter(d => d.status === 1).length,
      offline: deviceList.filter(d => !d.is_online).length,
      stale: staleCount,
      byType: deviceList.reduce((acc, device) => {
        acc[device.device_type] = (acc[device.device_type] || 0) + 1
        return acc
      }, {}),
      byLocation: deviceList.reduce((acc, device) => {
        if (device.location) {
          acc[device.location] = (acc[device.location] || 0) + 1
        }
        return acc
      }, {})
    }
    setStats(newStats)
  }, [])

  // Fetch devices with heartbeat information
  const fetchDevices = useCallback(async () => {
    // If a real-time update arrives, clear any existing timeout
    if (toggleTimeoutRef.current) {
      clearTimeout(toggleTimeoutRef.current);
      toggleTimeoutRef.current = null;
    }

    if (!user) return;
    
    try {
      // Get devices with heartbeat information
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Add heartbeat status to each device
      const now = new Date()
      const devicesWithHeartbeat = (data || []).map(device => {
        const lastHeartbeat = new Date(device.last_heartbeat || device.created_at)
        const secondsSinceHeartbeat = Math.floor((now - lastHeartbeat) / 1000)
        
        return {
          ...device,
          secondsSinceHeartbeat,
          heartbeatStatus: HeartbeatUtils.getHeartbeatStatusText(secondsSinceHeartbeat, device.is_online),
          heartbeatColor: HeartbeatUtils.getHeartbeatStatusColor(secondsSinceHeartbeat, device.is_online),
          heartbeatIcon: HeartbeatUtils.getHeartbeatIcon(secondsSinceHeartbeat, device.is_online),
          needsAttention: HeartbeatUtils.needsAttention(secondsSinceHeartbeat, device.is_online)
        }
      })

      setDevices(devicesWithHeartbeat)
      updateStats(devicesWithHeartbeat)
      
      // Reset loading state
      setTogglingDeviceId(null)
    } catch (error) {
      console.error('Error fetching devices:', error)
    } finally {
      setLoading(false)
    }
  }, [user, updateStats])

  // Initialize heartbeat service and periodic refresh
  useEffect(() => {
    if (user) {
      console.log('🚀 Initializing heartbeat service for dashboard')
      
      // Start the heartbeat monitoring service
      HeartbeatService.startService()
      
      // Periodically refresh devices to update heartbeat status
      const refreshInterval = setInterval(() => {
        fetchDevices()
      }, 30000) // Every 30 seconds
      
      heartbeatIntervalRef.current = refreshInterval
      
      return () => {
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current)
        }
        HeartbeatService.stopService()
      }
    }
  }, [user, fetchDevices])

  // Visibility change handler for mobile
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('App re-focused, syncing devices...');
        fetchDevices();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchDevices]);
  // Subscribe to device changes with real-time updates
  const subscribeToDeviceChanges = useCallback(() => {
    if (!user) return;

    const channel = supabase
      .channel('devices_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'devices',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Device change received:', payload)
          fetchDevices()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, fetchDevices])

  // Initialize device fetching and subscriptions
  useEffect(() => {
    if (user) {
      fetchDevices()
      const cleanup = subscribeToDeviceChanges()
      return cleanup
    }
  }, [user, fetchDevices, subscribeToDeviceChanges])

  // Handle adding new device
  const handleAddDevice = async () => {
    try {
      const { data: existingDevice } = await supabase
        .from('devices')
        .select('id')
        .eq('device_id', deviceForm.device_id)
        .eq('user_id', user.id)
        .single()

      if (existingDevice) {
        alert('Device ID already exists! Please use a different Device ID.')
        return
      }

      const { data, error } = await supabase
        .from('devices')
        .insert([{
          ...deviceForm,
          user_id: user.id,
          is_online: true,
          last_heartbeat: new Date().toISOString() // Set initial heartbeat
        }])
        .select()

      if (error) throw error

      await supabase
        .from('device_logs')
        .insert([{
          device_id: data[0].id,
          user_id: user.id,
          action: 'created',
          new_status: 0
        }])

      setDeviceForm({
        device_id: '',
        device_name: '',
        device_type: 'light',
        location: '',
        qr_code: ''
      })
      setShowAddDevice(false)
      
    } catch (error) {
      console.error('Error adding device:', error)
      alert('Error adding device: ' + error.message)
    }
  }

  // Toggle device status with enhanced heartbeat handling
  const toggleDeviceStatus = async (device) => {
    // Prevent multiple clicks and set loading state immediately
    if (togglingDeviceId === device.id) return;
    setTogglingDeviceId(device.id);

    // Clear any existing timeout
    if (toggleTimeoutRef.current) {
      clearTimeout(toggleTimeoutRef.current);
      toggleTimeoutRef.current = null;
    }

    // Set a 6-second fail-safe timeout
    toggleTimeoutRef.current = setTimeout(() => {
      console.warn('Toggle timeout reached. Forcing UI update.');
      setTogglingDeviceId(null);
      toggleTimeoutRef.current = null;
      fetchDevices();
    }, 6000);

    try {
      const newStatus = device.status === 1 ? 0 : 1;
      
      // Optimistic update - immediately update local state
      setDevices(prevDevices => 
        prevDevices.map(d => 
          d.id === device.id 
            ? { ...d, status: newStatus, updated_at: new Date().toISOString() }
            : d
        )
      );

      const { error } = await supabase
        .from('devices')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
          last_heartbeat: new Date().toISOString() // Update heartbeat on status change
        })
        .eq('id', device.id);
  
      if (error) {
        throw error;
      }

      // Log the action
      await supabase
        .from('device_logs')
        .insert([{
          device_id: device.id,
          user_id: user.id,
          action: newStatus === 1 ? 'turn_on' : 'turn_off',
          old_status: device.status,
          new_status: newStatus
        }]);

      // Clear timeout and loading state on success
      if (toggleTimeoutRef.current) {
        clearTimeout(toggleTimeoutRef.current);
        toggleTimeoutRef.current = null;
      }
      setTogglingDeviceId(null);

    } catch (error) {
      console.error('Error toggling device:', error);
      alert('Error controlling device: ' + error.message);
      
      // Revert optimistic update on error
      setDevices(prevDevices => 
        prevDevices.map(d => 
          d.id === device.id 
            ? { ...d, status: device.status } // Revert to original status
            : d
        )
      );
      
      // Clear timeout and reset button
      if (toggleTimeoutRef.current) {
        clearTimeout(toggleTimeoutRef.current);
        toggleTimeoutRef.current = null;
      }
      setTogglingDeviceId(null);
    }
  };

  // Delete device
  const deleteDevice = async (deviceId) => {
    if (!window.confirm('Are you sure you want to delete this device?')) return

    try {
      const { error } = await supabase
        .from('devices')
        .delete()
        .eq('id', deviceId)

      if (error) throw error

    } catch (error) {
      console.error('Error deleting device:', error)
      alert('Error deleting device: ' + error.message)
    }
  }

  // Generate QR Code
  const generateQRCode = () => {
    const qrData = `DEVICE:${deviceForm.device_id}:${Date.now()}`
    setDeviceForm(prev => ({ ...prev, qr_code: qrData }))
  }

  // Generate Device ID
  const generateDeviceId = () => {
    const prefix = deviceForm.device_type.toUpperCase().substring(0, 3)
    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase()
    setDeviceForm(prev => ({ ...prev, device_id: `${prefix}_${randomId}` }))
  }

  // Fetch device logs
  const fetchDeviceLogs = async (deviceId) => {
    try {
      const { data, error } = await supabase
        .from('device_logs')
        .select(`
          *,
          devices (device_name)
        `)
        .eq('device_id', deviceId)
        .order('timestamp', { ascending: false })
        .limit(20)

      if (error) throw error
      setDeviceLogs(data || [])
    } catch (error) {
      console.error('Error fetching device logs:', error)
    }
  }

  // Force heartbeat for testing
  const forceHeartbeat = async (deviceId) => {
    const { success, data } = await HeartbeatService.forceHeartbeat(deviceId)
    if (success) {
      console.log('💓 Heartbeat forced:', data)
      fetchDevices() // Refresh to show updated heartbeat
    } else {
      console.error('❌ Force heartbeat failed')
    }
  }

  // Force offline check
  const forceOfflineCheck = async () => {
    try {
      const { data, error } = await supabase.rpc('mark_offline_devices')
      if (error) throw error
      console.log('🔍 Offline check completed:', data)
      fetchDevices() // Refresh devices after offline check
    } catch (error) {
      console.error('❌ Offline check failed:', error)
    }
  }

  // Filter devices based on search and filters
  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.device_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.device_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.location.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = filterType === 'all' || device.device_type === filterType
    const matchesLocation = filterLocation === 'all' || device.location === filterLocation
    
    return matchesSearch && matchesType && matchesLocation
  })

  // Get unique types and locations for filters
  const uniqueTypes = [...new Set(devices.map(d => d.device_type))]
  const uniqueLocations = [...new Set(devices.map(d => d.location))]

  // Loading state
  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Initializing SmartHub Pro...</p>
        </div>
      </div>
    )
  }
  return (
    <div className="dashboard-container">
      <Header 
        onAddDevice={() => setShowAddDevice(true)}
        deviceStats={stats}
        showMobileMenu={showMobileMenu}
        setShowMobileMenu={setShowMobileMenu}
      />

      <div className="dashboard-layout">
        {/* Sidebar */}
        <aside className={`dashboard-sidebar ${showMobileMenu ? 'show' : ''}`}>
          <nav className="sidebar-nav">
            <button 
              className={`nav-item ${activeView === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveView('overview')}
            >
              <span className="nav-icon">📊</span>
              <span className="nav-text">Overview</span>
            </button>
            <button 
              className={`nav-item ${activeView === 'devices' ? 'active' : ''}`}
              onClick={() => setActiveView('devices')}
            >
              <span className="nav-icon">📱</span>
              <span className="nav-text">Devices</span>
              <span className="nav-badge">{stats.total}</span>
            </button>
            <button 
              className={`nav-item ${activeView === 'heartbeat' ? 'active' : ''}`}
              onClick={() => setActiveView('heartbeat')}
            >
              <span className="nav-icon">💓</span>
              <span className="nav-text">Heartbeat Monitor</span>
              {stats.stale > 0 && <span className="nav-badge" style={{background: '#f59e0b'}}>{stats.stale}</span>}
            </button>
            <button 
              className={`nav-item ${activeView === 'automation' ? 'active' : ''}`}
              onClick={() => setActiveView('automation')}
            >
              <span className="nav-icon">⚙️</span>
              <span className="nav-text">Automation</span>
            </button>
            <button 
              className={`nav-item ${activeView === 'energy' ? 'active' : ''}`}
              onClick={() => setActiveView('energy')}
            >
              <span className="nav-icon">⚡</span>
              <span className="nav-text">Energy</span>
            </button>
            <button 
              className={`nav-item ${activeView === 'security' ? 'active' : ''}`}
              onClick={() => setActiveView('security')}
            >
              <span className="nav-icon">🔒</span>
              <span className="nav-text">Security</span>
            </button>
            <button 
              className={`nav-item ${activeView === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveView('analytics')}
            >
              <span className="nav-icon">📈</span>
              <span className="nav-text">Analytics</span>
            </button>
          </nav>

          <div className="sidebar-footer">
            <div className="system-status">
              <div className="status-item">
                <span className="status-label">System Status</span>
                <span className="status-value online">Operational</span>
              </div>
              <div className="status-item">
                <span className="status-label">Heartbeat Service</span>
                <span className="status-value online">
                  {HeartbeatService.isServiceHealthy().isRunning ? 'Running' : 'Stopped'}
                </span>
              </div>
              <div className="status-item">
                <span className="status-label">Last Sync</span>
                <span className="status-value">Just now</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="dashboard-main">
          {activeView === 'overview' && (
            <div className="overview-content">
              <div className="content-header">
                <h2>Smart Home Overview</h2>
                <p>Monitor and control your connected devices with real-time heartbeat monitoring</p>
              </div>

              {/* Enhanced Stats Cards with Heartbeat */}
              <div className="stats-grid">
                <div className="stat-card primary">
                  <div className="card-header">
                    <span className="card-icon">📊</span>
                    <span className="card-title">Total Devices</span>
                  </div>
                  <div className="card-content">
                    <div className="stat-number">{stats.total}</div>
                    <div className="stat-change positive">Connected ecosystem</div>
                  </div>
                </div>

                <div className="stat-card success">
                  <div className="card-header">
                    <span className="card-icon">💚</span>
                    <span className="card-title">Healthy Devices</span>
                  </div>
                  <div className="card-content">
                    <div className="stat-number">{stats.online - stats.stale}</div>
                    <div className="stat-percentage">{stats.total > 0 ? Math.round(((stats.online - stats.stale) / stats.total) * 100) : 0}%</div>
                  </div>
                </div>

                <div className="stat-card warning">
                  <div className="card-header">
                    <span className="card-icon">💛</span>
                    <span className="card-title">Stale Devices</span>
                  </div>
                  <div className="card-content">
                    <div className="stat-number">{stats.stale}</div>
                    <div className="stat-change negative">{stats.stale > 0 ? 'Need attention' : 'All good'}</div>
                  </div>
                </div>

                <div className="stat-card danger">
                  <div className="card-header">
                    <span className="card-icon">💔</span>
                    <span className="card-title">Offline Devices</span>
                  </div>
                  <div className="card-content">
                    <div className="stat-number">{stats.offline}</div>
                    <div className="stat-change negative">{stats.offline > 0 ? 'Monitor needed' : 'All online'}</div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="quick-actions">
                <h3>Quick Actions</h3>
                <div className="actions-grid">
                  <button className="action-card" onClick={() => setShowAddDevice(true)}>
                    <span className="action-icon">➕</span>
                    <span className="action-title">Add Device</span>
                    <span className="action-desc">Connect new smart device</span>
                  </button>
                  <button className="action-card" onClick={() => setActiveView('heartbeat')}>
                    <span className="action-icon">💓</span>
                    <span className="action-title">Heartbeat Monitor</span>
                    <span className="action-desc">Check device health</span>
                  </button>
                  <button className="action-card" onClick={forceOfflineCheck}>
                    <span className="action-icon">🔄</span>
                    <span className="action-title">Sync All</span>
                    <span className="action-desc">Refresh device status</span>
                  </button>
                  <button className="action-card">
                    <span className="action-icon">🏠</span>
                    <span className="action-title">Home Mode</span>
                    <span className="action-desc">Activate scene</span>
                  </button>
                </div>
              </div>

              {/* Recent Activity with Heartbeat Alerts */}
              <div className="recent-activity">
                <h3>Recent Activity</h3>
                <div className="activity-list">
                  {devices.filter(d => d.needsAttention).slice(0, 3).map(device => (
                    <div key={device.id} className="activity-item">
                      <div className="activity-icon">💓</div>
                      <div className="activity-content">
                        <span className="activity-text">{device.device_name} needs attention - {device.heartbeatStatus}</span>
                        <span className="activity-time">{HeartbeatUtils.formatTimeSinceHeartbeat(device.secondsSinceHeartbeat)}</span>
                      </div>
                    </div>
                  ))}
                  {devices.filter(d => d.needsAttention).length === 0 && (
                    <div className="activity-item">
                      <div className="activity-icon">✅</div>
                      <div className="activity-content">
                        <span className="activity-text">All devices are healthy and responding</span>
                        <span className="activity-time">System status: Excellent</span>
                      </div>
                    </div>
                  )}
                  <div className="activity-item">
                    <div className="activity-icon">🌡️</div>
                    <div className="activity-content">
                      <span className="activity-text">System temperature normal</span>
                      <span className="activity-time">15 minutes ago</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeView === 'heartbeat' && (
            <div className="heartbeat-content">
              <div className="content-header">
                <div className="header-left">
                  <h2>Heartbeat Monitor</h2>
                  <p>Real-time device health monitoring and diagnostics</p>
                </div>
                <div className="header-actions">
                  <button 
                    className="primary-btn"
                    onClick={forceOfflineCheck}
                  >
                    <span>🔄</span> Check All Devices
                  </button>
                </div>
              </div>

              {/* Heartbeat Stats */}
              <div className="stats-grid">
                <div className="stat-card success">
                  <div className="card-header">
                    <span className="card-icon">💚</span>
                    <span className="card-title">Healthy Devices</span>
                  </div>
                  <div className="card-content">
                    <div className="stat-number">{stats.online - stats.stale}</div>
                    <div className="stat-change positive">Active heartbeats</div>
                  </div>
                </div>

                <div className="stat-card warning">
                  <div className="card-header">
                    <span className="card-icon">💛</span>
                    <span className="card-title">Stale Devices</span>
                  </div>
                  <div className="card-content">
                    <div className="stat-number">{stats.stale}</div>
                    <div className="stat-change negative">Need attention</div>
                  </div>
                </div>

                <div className="stat-card danger">
                  <div className="card-header">
                    <span className="card-icon">💔</span>
                    <span className="card-title">Offline Devices</span>
                  </div>
                  <div className="card-content">
                    <div className="stat-number">{stats.offline}</div>
                    <div className="stat-change negative">No heartbeat</div>
                  </div>
                </div>

                <div className="stat-card primary">
                  <div className="card-header">
                    <span className="card-icon">📊</span>
                    <span className="card-title">Health Score</span>
                  </div>
                  <div className="card-content">
                    <div className="stat-number">{stats.total > 0 ? Math.round(((stats.online - stats.stale) / stats.total) * 100) : 0}%</div>
                    <div className="stat-percentage">System health</div>
                  </div>
                </div>
              </div>

              {/* Device Heartbeat List */}
              <div className="heartbeat-devices">
                <h3>Device Heartbeat Status</h3>
                <div className="devices-grid">
                  {devices.map(device => (
                    <div key={device.id} className={`device-card heartbeat-device ${device.needsAttention ? 'needs-attention' : ''}`}>
                      <div className="device-header">
                        <div className="device-info">
                          <h3>{device.device_name}</h3>
                          <span className="device-location">{device.location}</span>
                        </div>
                        <div className="heartbeat-status">
                          <span className="heartbeat-icon">{device.heartbeatIcon}</span>
                          <span 
                            className="heartbeat-text"
                            style={{ color: device.heartbeatColor }}
                          >
                            {device.heartbeatStatus}
                          </span>
                        </div>
                      </div>

                      <div className="device-details">
                        <div className="heartbeat-info">
                          <div className="heartbeat-item">
                            <span className="heartbeat-label">Last Heartbeat:</span>
                            <span className="heartbeat-value">
                              {HeartbeatUtils.formatTimeSinceHeartbeat(device.secondsSinceHeartbeat)}
                            </span>
                          </div>
                          <div className="heartbeat-item">
                            <span className="heartbeat-label">Device ID:</span>
                            <span className="heartbeat-value">{device.device_id}</span>
                          </div>
                          <div className="heartbeat-item">
                            <span className="heartbeat-label">Status:</span>
                            <span className="heartbeat-value">
                              {device.status === 1 ? '🟢 ON' : '🔴 OFF'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="device-controls heartbeat-controls">
                        <button
                          onClick={() => forceHeartbeat(device.device_id)}
                          className="action-btn heartbeat-btn"
                          title="Force Heartbeat"
                        >
                          💓 Ping
                        </button>
                        <button
                          onClick={() => {
                            setSelectedDevice(device)
                            fetchDeviceLogs(device.id)
                            setShowDeviceLogs(true)
                          }}
                          className="action-btn logs-btn"
                          title="View Logs"
                        >
                          📋 Logs
                        </button>
                        {device.needsAttention && (
                          <span className="attention-badge">⚠️ Needs Attention</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeView === 'devices' && (
            <div className="devices-content">
              <div className="content-header">
                <div className="header-left">
                  <h2>Device Management</h2>
                  <p>Control and monitor your smart devices</p>
                </div>
                <div className="header-actions">
                  <button 
                    className="primary-btn"
                    onClick={() => setShowAddDevice(true)}
                  >
                    <span>➕</span> Add Device
                  </button>
                </div>
              </div>

              {/* Filters and Search */}
              <div className="devices-filters">
                <div className="search-box">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="Search devices..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
                <select 
                  value={filterType} 
                  onChange={(e) => setFilterType(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Types</option>
                  {uniqueTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <select 
                  value={filterLocation} 
                  onChange={(e) => setFilterLocation(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Locations</option>
                  {uniqueLocations.map(location => (
                    <option key={location} value={location}>{location}</option>
                  ))}
                </select>
              </div>

              {/* Devices Grid with Enhanced Heartbeat Info */}
              {filteredDevices.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📱</div>
                  <h3>No devices found</h3>
                  <p>
                    {devices.length === 0 
                      ? "Add your first IoT device to get started with home automation"
                      : "No devices match your current filters"
                    }
                  </p>
                  {devices.length === 0 && (
                    <button 
                      onClick={() => setShowAddDevice(true)}
                      className="primary-btn"
                    >
                      Add Your First Device
                    </button>
                  )}
                </div>
              ) : (
                <div className="devices-grid">
                  {filteredDevices.map(device => (
                    <div key={device.id} className={`device-card ${device.needsAttention ? 'needs-attention' : ''}`}>
                      <div className="device-header">
                        <div className="device-info">
                          <h3>{device.device_name}</h3>
                          <span className="device-location">{device.location}</span>
                        </div>
                        <div className="device-status-container">
                          <div className={`device-status ${device.is_online ? 'online' : 'offline'}`}>
                            {device.heartbeatIcon}
                          </div>
                          <div className="heartbeat-mini-info">
                            <span 
                              className="heartbeat-mini-text"
                              style={{ color: device.heartbeatColor }}
                            >
                              {device.heartbeatStatus}
                            </span>
                            <span className="heartbeat-mini-time">
                              {HeartbeatUtils.formatTimeSinceHeartbeat(device.secondsSinceHeartbeat)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="device-details">
                        <div className="device-type">
                          <span className="type-icon">
                            {device.device_type === 'light' ? '💡' : 
                             device.device_type === 'fan' ? '🌀' : 
                             device.device_type === 'ac' ? '❄️' : 
                             device.device_type === 'heater' ? '🔥' : '🔌'}
                          </span>
                          <span>{device.device_type}</span>
                        </div>
                        <div className="device-id">ID: {device.device_id}</div>
                        {device.needsAttention && (
                          <div className="attention-warning">
                            ⚠️ Device needs attention
                          </div>
                        )}
                      </div>

                      <div className="device-controls">
                        <button
                          onClick={() => toggleDeviceStatus(device)}
                          disabled={!device.is_online || togglingDeviceId === device.id}
                          className={`device-toggle-btn ${
                            togglingDeviceId === device.id 
                              ? 'loading' 
                              : device.status === 1 
                                ? 'state-on' 
                                : 'state-off'
                          }`}
                        >
                          {togglingDeviceId === device.id
                            ? '⏳ Please wait...'
                            : device.status === 1 
                              ? '🔴 Turn Off' 
                              : '🟢 Turn On'}
                        </button>

                        <div className="device-actions">
                          <button
                            onClick={() => forceHeartbeat(device.device_id)}
                            className="action-btn heartbeat-btn"
                            title="Force Heartbeat"
                          >
                            💓
                          </button>
                          <button
                            onClick={() => {
                              setSelectedDevice(device)
                              fetchDeviceLogs(device.id)
                              setShowDeviceLogs(true)
                            }}
                            className="action-btn logs-btn"
                            title="View Logs"
                          >
                            📋
                          </button>
                          <button
                            onClick={() => deleteDevice(device.id)}
                            className="action-btn delete-btn"
                            title="Delete Device"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Other views placeholders */}
          {activeView === 'automation' && (
            <div className="placeholder-content">
              <h2>Automation Rules</h2>
              <p>Create and manage automation scenarios</p>
              <div className="coming-soon">
                <span className="coming-soon-icon">🚧</span>
                <span>Coming Soon</span>
              </div>
            </div>
          )}

          {activeView === 'energy' && (
            <div className="placeholder-content">
              <h2>Energy Management</h2>
              <p>Monitor and optimize energy consumption</p>
              <div className="coming-soon">
                <span className="coming-soon-icon">🚧</span>
                <span>Coming Soon</span>
              </div>
            </div>
          )}

          {activeView === 'security' && (
            <div className="placeholder-content">
              <h2>Security Center</h2>
              <p>Manage home security and access control</p>
              <div className="coming-soon">
                <span className="coming-soon-icon">🚧</span>
                <span>Coming Soon</span>
              </div>
            </div>
          )}

          {activeView === 'analytics' && (
            <div className="placeholder-content">
              <h2>Analytics Dashboard</h2>
              <p>Detailed insights and reporting</p>
              <div className="coming-soon">
                <span className="coming-soon-icon">🚧</span>
                <span>Coming Soon</span>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add Device Modal */}
      {showAddDevice && (
        <div className="modal-overlay" onClick={() => setShowAddDevice(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Device</h2>
              <button 
                onClick={() => setShowAddDevice(false)}
                className="modal-close"
              >
                ✕
              </button>
            </div>

            <div className="device-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Device ID</label>
                  <div className="input-with-button">
                    <input
                      type="text"
                      value={deviceForm.device_id}
                      onChange={(e) => setDeviceForm(prev => ({ ...prev, device_id: e.target.value }))}
                      placeholder="ESP32_ABC123"
                      required
                    />
                    <button type="button" onClick={generateDeviceId} className="generate-btn">
                      🎲
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Device Type</label>
                  <select
                    value={deviceForm.device_type}
                    onChange={(e) => setDeviceForm(prev => ({ ...prev, device_type: e.target.value }))}
                  >
                    <option value="light">Light</option>
                    <option value="fan">Fan</option>
                    <option value="ac">Air Conditioner</option>
                    <option value="heater">Heater</option>
                    <option value="outlet">Smart Outlet</option>
                    <option value="sensor">Sensor</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Device Name</label>
                  <input
                    type="text"
                    value={deviceForm.device_name}
                    onChange={(e) => setDeviceForm(prev => ({ ...prev, device_name: e.target.value }))}
                    placeholder="Kitchen Light"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    value={deviceForm.location}
                    onChange={(e) => setDeviceForm(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Kitchen"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>QR Code Data (Optional)</label>
                <div className="input-with-button">
                  <input
                    type="text"
                    value={deviceForm.qr_code}
                    onChange={(e) => setDeviceForm(prev => ({ ...prev, qr_code: e.target.value }))}
                    placeholder="QR code data for device setup"
                  />
                  <button type="button" onClick={generateQRCode} className="generate-btn">
                    📷
                  </button>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowAddDevice(false)} className="cancel-btn">
                  Cancel
                </button>
                <button type="button" onClick={handleAddDevice} className="submit-btn">
                  Add Device
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Device Logs Modal */}
      {showDeviceLogs && selectedDevice && (
        <div className="modal-overlay" onClick={() => setShowDeviceLogs(false)}>
          <div className="modal-content logs-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Device Logs - {selectedDevice.device_name}</h2>
              <button 
                onClick={() => setShowDeviceLogs(false)}
                className="modal-close"
              >
                ✕
              </button>
            </div>

            <div className="logs-content">
              {deviceLogs.length === 0 ? (
                <div className="empty-logs">
                  <p>No logs available for this device</p>
                </div>
              ) : (
                <div className="logs-list">
                  {deviceLogs.map(log => (
                    <div key={log.id} className="log-entry">
                      <div className="log-time">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                      <div className="log-action">
                        <span className={`action-badge ${log.action}`}>
                          {log.action === 'turn_on' ? '🟢 ON' : 
                           log.action === 'turn_off' ? '🔴 OFF' : 
                           log.action === 'created' ? '➕ Created' : 
                           log.action}
                        </span>
                      </div>
                      {log.old_status !== null && log.new_status !== null && (
                        <div className="log-change">
                          {log.old_status} → {log.new_status}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile menu overlay */}
      {showMobileMenu && (
        <div 
          className="mobile-overlay" 
          onClick={() => setShowMobileMenu(false)}
        ></div>
      )}
    </div>
  )
}

export default Dashboard
