import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import './Dashboard.css'

const Dashboard = () => {
  const { user, signOut } = useAuth()
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddDevice, setShowAddDevice] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [showDeviceLogs, setShowDeviceLogs] = useState(false)
  const [deviceLogs, setDeviceLogs] = useState([])
  
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
    active: 0
  })

  const updateStats = useCallback((deviceList) => {
    setStats({
      total: deviceList.length,
      online: deviceList.filter(d => d.is_online).length,
      active: deviceList.filter(d => d.status === 1).length
    })
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
          fetchDevices() // Refresh the list
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
      // Check if device_id already exists for this user
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
          is_online: true // New devices start as online
        }])
        .select()

      if (error) throw error

      // Log device creation
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
    try {
      const newStatus = device.status === 1 ? 0 : 1
      
      const { error } = await supabase
        .from('devices')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', device.id)

      if (error) throw error

    } catch (error) {
      console.error('Error toggling device:', error)
      alert('Error controlling device: ' + error.message)
    }
  }

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

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading your smart home...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-logo">
          <div className="logo-icon">🏠</div>
          <h1>Smart Home IoT</h1>
        </div>
        <div className="header-actions">
          <button 
            onClick={() => setShowAddDevice(true)} 
            className="add-device-btn"
          >
            <span>📱</span> Add Device
          </button>
          <button onClick={handleSignOut} className="signout-btn">
            Sign out
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-number">{stats.total}</div>
              <div className="stat-label">Total Devices</div>
            </div>
          </div>
          <div className="stat-card online">
            <div className="stat-icon">🟢</div>
            <div className="stat-content">
              <div className="stat-number">{stats.online}</div>
              <div className="stat-label">Online</div>
            </div>
          </div>
          <div className="stat-card active">
            <div className="stat-icon">💡</div>
            <div className="stat-content">
              <div className="stat-number">{stats.active}</div>
              <div className="stat-label">Active</div>
            </div>
          </div>
        </div>

        {/* Device Grid */}
        <div className="devices-section">
          <h2>Your Devices</h2>
          {devices.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📱</div>
              <h3>No devices yet</h3>
              <p>Add your first IoT device to get started with home automation</p>
              <button 
                onClick={() => setShowAddDevice(true)}
                className="add-first-device-btn"
              >
                Add Your First Device
              </button>
            </div>
          ) : (
            <div className="devices-grid">
              {devices.map(device => (
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
                    <div className="toggle-container">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={device.status === 1}
                          onChange={() => toggleDeviceStatus(device)}
                          disabled={!device.is_online}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                      <span className="toggle-label">
                        {device.status === 1 ? 'ON' : 'OFF'}
                      </span>
                    </div>

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
    </div>
  )
}

export default Dashboard