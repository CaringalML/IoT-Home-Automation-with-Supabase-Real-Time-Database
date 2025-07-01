// Device Management Service for IoT Smart Home
import { supabase } from '../lib/supabase'

export class DeviceService {
  // Get all devices for a user
  static async getUserDevices(userId) {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error fetching devices:', error)
      return { data: null, error }
    }
  }

  // Add a new device
  static async addDevice(deviceData, userId) {
    try {
      // Check if device_id already exists for this user
      const { data: existingDevice } = await supabase
        .from('devices')
        .select('id')
        .eq('device_id', deviceData.device_id)
        .eq('user_id', userId)
        .single()

      if (existingDevice) {
        throw new Error('Device ID already exists! Please use a different Device ID.')
      }

      const { data, error } = await supabase
        .from('devices')
        .insert([{
          ...deviceData,
          user_id: userId,
          is_online: true,
          status: 0
        }])
        .select()
        .single()

      if (error) throw error

      // Log device creation
      await this.logDeviceAction(data.id, userId, 'created', null, 0)

      return { data, error: null }
    } catch (error) {
      console.error('Error adding device:', error)
      return { data: null, error }
    }
  }

  // Update device status (ON/OFF)
  static async toggleDeviceStatus(deviceId, currentStatus) {
    try {
      const newStatus = currentStatus === 1 ? 0 : 1
      
      const { data, error } = await supabase
        .from('devices')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', deviceId)
        .select()
        .single()

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      console.error('Error toggling device:', error)
      return { data: null, error }
    }
  }

  // Update device online status
  static async updateDeviceOnlineStatus(deviceId, isOnline) {
    try {
      const { data, error } = await supabase
        .from('devices')
        .update({ 
          is_online: isOnline,
          updated_at: new Date().toISOString()
        })
        .eq('id', deviceId)
        .select()
        .single()

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      console.error('Error updating device status:', error)
      return { data: null, error }
    }
  }

  // Delete device
  static async deleteDevice(deviceId, userId) {
    try {
      // First, get device info for logging
      const { data: deviceInfo } = await supabase
        .from('devices')
        .select('device_name')
        .eq('id', deviceId)
        .single()

      // Log deletion before actually deleting
      if (deviceInfo) {
        await this.logDeviceAction(deviceId, userId, 'deleted', null, null, deviceInfo.device_name)
      }

      const { error } = await supabase
        .from('devices')
        .delete()
        .eq('id', deviceId)
        .eq('user_id', userId)

      if (error) throw error

      return { error: null }
    } catch (error) {
      console.error('Error deleting device:', error)
      return { error }
    }
  }

  // Update device information
  static async updateDevice(deviceId, updates, userId) {
    try {
      const { data, error } = await supabase
        .from('devices')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', deviceId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error

      // Log update action
      await this.logDeviceAction(deviceId, userId, 'updated')

      return { data, error: null }
    } catch (error) {
      console.error('Error updating device:', error)
      return { data: null, error }
    }
  }

  // Get device logs
  static async getDeviceLogs(deviceId, limit = 20) {
    try {
      const { data, error } = await supabase
        .from('device_logs')
        .select(`
          *,
          devices (device_name)
        `)
        .eq('device_id', deviceId)
        .order('timestamp', { ascending: false })
        .limit(limit)

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error fetching device logs:', error)
      return { data: null, error }
    }
  }

  // Log device action
  static async logDeviceAction(deviceId, userId, action, oldStatus = null, newStatus = null, deviceName = null) {
    try {
      const { error } = await supabase
        .from('device_logs')
        .insert([{
          device_id: deviceId,
          user_id: userId,
          action,
          old_status: oldStatus,
          new_status: newStatus,
          device_name: deviceName
        }])

      if (error) throw error
    } catch (error) {
      console.error('Error logging device action:', error)
    }
  }

  // Subscribe to real-time device changes
  static subscribeToDeviceChanges(userId, callback) {
    const channel = supabase
      .channel('devices_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'devices',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe()

    return channel
  }

  // Get device statistics
  static calculateDeviceStats(devices) {
    return {
      total: devices.length,
      online: devices.filter(d => d.is_online).length,
      offline: devices.filter(d => !d.is_online).length,
      active: devices.filter(d => d.status === 1).length,
      inactive: devices.filter(d => d.status === 0).length,
      byType: devices.reduce((acc, device) => {
        acc[device.device_type] = (acc[device.device_type] || 0) + 1
        return acc
      }, {}),
      byLocation: devices.reduce((acc, device) => {
        if (device.location) {
          acc[device.location] = (acc[device.location] || 0) + 1
        }
        return acc
      }, {})
    }
  }

  // Generate unique device ID
  static generateDeviceId(deviceType = 'DEV') {
    const prefix = deviceType.toUpperCase().substring(0, 3)
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `${prefix}_${timestamp}_${random}`
  }

  // Generate QR code data
  static generateQRCode(deviceId, deviceType, location) {
    const qrData = {
      device_id: deviceId,
      type: deviceType,
      location: location,
      timestamp: Date.now(),
      setup_url: `${window.location.origin}/setup/${deviceId}`
    }
    return JSON.stringify(qrData)
  }

  // Validate device data
  static validateDeviceData(deviceData) {
    const errors = []

    if (!deviceData.device_id || deviceData.device_id.trim() === '') {
      errors.push('Device ID is required')
    }

    if (!deviceData.device_name || deviceData.device_name.trim() === '') {
      errors.push('Device name is required')
    }

    if (!deviceData.device_type || deviceData.device_type.trim() === '') {
      errors.push('Device type is required')
    }

    if (!deviceData.location || deviceData.location.trim() === '') {
      errors.push('Location is required')
    }

    // Check device ID format (basic validation)
    const deviceIdPattern = /^[A-Z0-9_-]+$/i
    if (deviceData.device_id && !deviceIdPattern.test(deviceData.device_id)) {
      errors.push('Device ID can only contain letters, numbers, underscores, and hyphens')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Simulate ESP32 device communication
  static async simulateESP32Response(deviceId, action) {
    // This would normally communicate with your ESP32 devices
    // For demo purposes, we'll simulate the response
    
    return new Promise((resolve) => {
      setTimeout(() => {
        const responses = {
          'turn_on': { success: true, message: 'Device turned ON', status: 1 },
          'turn_off': { success: true, message: 'Device turned OFF', status: 0 },
          'status_check': { success: true, message: 'Status retrieved', online: true },
          'ping': { success: true, message: 'Device responding', latency: Math.floor(Math.random() * 100) + 50 }
        }
        
        resolve(responses[action] || { success: false, message: 'Unknown action' })
      }, Math.random() * 1000 + 500) // Simulate network delay
    })
  }

  // Batch operations
  static async toggleMultipleDevices(deviceIds, targetStatus, userId) {
    try {
      const results = []
      
      for (const deviceId of deviceIds) {
        const result = await this.toggleDeviceStatus(deviceId, targetStatus === 1 ? 0 : 1)
        results.push({ deviceId, ...result })
      }

      return { results, error: null }
    } catch (error) {
      console.error('Error in batch toggle:', error)
      return { results: null, error }
    }
  }

  // Get devices by location
  static async getDevicesByLocation(userId, location) {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', userId)
        .eq('location', location)
        .order('device_name')

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error fetching devices by location:', error)
      return { data: null, error }
    }
  }

  // Get devices by type
  static async getDevicesByType(userId, deviceType) {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', userId)
        .eq('device_type', deviceType)
        .order('device_name')

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error fetching devices by type:', error)
      return { data: null, error }
    }
  }

  // Search devices
  static async searchDevices(userId, searchTerm) {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', userId)
        .or(`device_name.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%,device_id.ilike.%${searchTerm}%`)
        .order('device_name')

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error searching devices:', error)
      return { data: null, error }
    }
  }
}

// Export utility functions
export const DeviceUtils = {
  // Format device status for display
  formatStatus: (status) => status === 1 ? 'ON' : 'OFF',
  
  // Format online status for display
  formatOnlineStatus: (isOnline) => isOnline ? 'Online' : 'Offline',
  
  // Get device type icon
  getDeviceIcon: (deviceType) => {
    const icons = {
      light: '💡',
      fan: '🌀',
      ac: '❄️',
      heater: '🔥',
      outlet: '🔌',
      sensor: '📡',
      camera: '📷',
      door: '🚪',
      window: '🪟',
      thermostat: '🌡️'
    }
    return icons[deviceType] || '🔌'
  },
  
  // Format last updated time
  formatLastUpdated: (timestamp) => {
    if (!timestamp) return 'Never'
    
    const now = new Date()
    const updated = new Date(timestamp)
    const diffMs = now - updated
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    
    return updated.toLocaleDateString()
  },
  
  // Get status color
  getStatusColor: (status, isOnline) => {
    if (!isOnline) return '#6b7280' // gray
    return status === 1 ? '#00d4aa' : '#ff6b6b' // green : red
  },
  
  // Validate device ID format
  isValidDeviceId: (deviceId) => {
    const pattern = /^[A-Z0-9_-]{3,20}$/i
    return pattern.test(deviceId)
  },
  
  // Generate device summary
  generateDeviceSummary: (devices) => {
    const summary = {
      totalDevices: devices.length,
      activeDevices: devices.filter(d => d.status === 1).length,
      onlineDevices: devices.filter(d => d.is_online).length,
      recentlyUpdated: devices.filter(d => {
        const updated = new Date(d.updated_at)
        const now = new Date()
        return (now - updated) < (24 * 60 * 60 * 1000) // Last 24 hours
      }).length,
      locations: [...new Set(devices.map(d => d.location))],
      deviceTypes: [...new Set(devices.map(d => d.device_type))]
    }
    
    return summary
  }
}

// Export default service
export default DeviceService