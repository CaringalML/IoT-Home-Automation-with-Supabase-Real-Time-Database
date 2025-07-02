import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import Header from '../Layout/Header'
import './Dashboard.css'

const Dashboard = () => {
  const { user } = useAuth()
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

  // Form states
  const [deviceForm, setDeviceForm] = useState({
    device_id: '',
    device_name: '',
    device_type: 'light',
    location: '',
    qr_code: ''
  })
  
  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    online: 0,
    active: 0,
    offline: 0,
    byType: {},
    byLocation: {}
  })

  const updateStats = useCallback((deviceList) => {
    const newStats = {
      total: deviceList.length,
      online: deviceList.filter(d => d.is_online).length,
      active: deviceList.filter(d => d.status === 1).length,
      offline: deviceList.filter(d => !d.is_online).length,
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

  const fetchDevices = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setDevices(data || [])
      updateStats(data || [])
      
      // Reset toggling state when devices are updated from server
      setTogglingDeviceId(null)
    } catch (error) {
      console.error('Error fetching devices:', error)
    } finally {
      setLoading(false)
    }
  }, [user, updateStats])

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
          console.log('Device change:', payload)
          fetchDevices()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, fetchDevices])

  useEffect(() => {
    if (user) {
      fetchDevices()
      const cleanup = subscribeToDeviceChanges()
      return cleanup
    }
  }, [user, fetchDevices, subscribeToDeviceChanges])

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
          is_online: true
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

  const toggleDeviceStatus = async (device) => {
    setTogglingDeviceId(device.id);
    try {
      const newStatus = device.status === 1 ? 0 : 1;
      const { error } = await supabase
        .from('devices')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', device.id);
  
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error toggling device:', error);
      alert('Error controlling device: ' + error.message);
      // If there's an error, re-enable the button
      setTogglingDeviceId(null);
    }
  };

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

  const updateDeviceStatus = async (deviceId, isOnline) => {
    try {
      const { error } = await supabase
        .from('devices')
        .update({ is_online: isOnline })
        .eq('id', deviceId)

      if (error) throw error
    } catch (error) {
      console.error('Error updating device status:', error)
    }
  }

  const generateQRCode = () => {
    const qrData = `DEVICE:${deviceForm.device_id}:${Date.now()}`
    setDeviceForm(prev => ({ ...prev, qr_code: qrData }))
  }

  const generateDeviceId = () => {
    const prefix = deviceForm.device_type.toUpperCase().substring(0, 3)
    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase()
    setDeviceForm(prev => ({ ...prev, device_id: `${prefix}_${randomId}` }))
  }

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
                <p>Monitor and control your connected devices</p>
              </div>

              {/* Stats Cards */}
              <div className="stats-grid">
                <div className="stat-card primary">
                  <div className="card-header">
                    <span className="card-icon">📊</span>
                    <span className="card-title">Total Devices</span>
                  </div>
                  <div className="card-content">
                    <div className="stat-number">{stats.total}</div>
                    <div className="stat-change positive">+2 this week</div>
                  </div>
                </div>

                <div className="stat-card success">
                  <div className="card-header">
                    <span className="card-icon">🟢</span>
                    <span className="card-title">Online</span>
                  </div>
                  <div className="card-content">
                    <div className="stat-number">{stats.online}</div>
                    <div className="stat-percentage">{stats.total > 0 ? Math.round((stats.online / stats.total) * 100) : 0}%</div>
                  </div>
                </div>

                <div className="stat-card warning">
                  <div className="card-header">
                    <span className="card-icon">💡</span>
                    <span className="card-title">Active</span>
                  </div>
                  <div className="card-content">
                    <div className="stat-number">{stats.active}</div>
                    <div className="stat-percentage">{stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%</div>
                  </div>
                </div>

                <div className="stat-card danger">
                  <div className="card-header">
                    <span className="card-icon">🔴</span>
                    <span className="card-title">Offline</span>
                  </div>
                  <div className="card-content">
                    <div className="stat-number">{stats.offline}</div>
                    <div className="stat-change negative">-1 today</div>
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
                  <button className="action-card">
                    <span className="action-icon">⚡</span>
                    <span className="action-title">Energy Report</span>
                    <span className="action-desc">View usage analytics</span>
                  </button>
                  <button className="action-card">
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

              {/* Recent Activity */}
              <div className="recent-activity">
                <h3>Recent Activity</h3>
                <div className="activity-list">
                  <div className="activity-item">
                    <div className="activity-icon">💡</div>
                    <div className="activity-content">
                      <span className="activity-text">Living Room Light turned on</span>
                      <span className="activity-time">2 minutes ago</span>
                    </div>
                  </div>
                  <div className="activity-item">
                    <div className="activity-icon">🌡️</div>
                    <div className="activity-content">
                      <span className="activity-text">Thermostat set to 72°F</span>
                      <span className="activity-time">15 minutes ago</span>
                    </div>
                  </div>
                  <div className="activity-item">
                    <div className="activity-icon">🔒</div>
                    <div className="activity-content">
                      <span className="activity-text">Front Door locked</span>
                      <span className="activity-time">1 hour ago</span>
                    </div>
                  </div>
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

              {/* Devices Grid */}
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
                    <div key={device.id} className="device-card">
                      <div className="device-header">
                        <div className="device-info">
                          <h3>{device.device_name}</h3>
                          <span className="device-location">{device.location}</span>
                        </div>
                        <div className={`device-status ${device.is_online ? 'online' : 'offline'}`}>
                          {device.is_online ? '🟢' : '🔴'}
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
                      </div>

                      <div className="device-controls">
                        <button
                          onClick={() => toggleDeviceStatus(device)}
                          disabled={!device.is_online || togglingDeviceId !== null}
                          className={`device-toggle-btn ${device.status === 1 ? 'state-off' : 'state-on'}`}
                        >
                          {togglingDeviceId === device.id
                            ? (device.status === 1 ? 'Turning Off...' : 'Turning On...')
                            : (device.status === 1 ? 'Turn Off' : 'Turn On')}
                        </button>

                        <div className="device-actions">
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
                            onClick={() => updateDeviceStatus(device.id, !device.is_online)}
                            className="action-btn status-btn"
                            title="Toggle Online Status"
                          >
                            {device.is_online ? '🔴' : '🟢'}
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