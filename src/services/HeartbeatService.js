// src/services/HeartbeatService.js
// Service to monitor device heartbeats and mark offline devices

import { supabase } from '../lib/supabase'

export class HeartbeatService {
  static instance = null
  static isRunning = false
  static intervalId = null
  static callbacks = new Set()

  // Singleton pattern
  static getInstance() {
    if (!HeartbeatService.instance) {
      HeartbeatService.instance = new HeartbeatService()
    }
    return HeartbeatService.instance
  }

  constructor() {
    this.offlineCheckInterval = 60000 // Check every minute
    this.heartbeatTimeout = 120000 // 2 minutes timeout
  }

  // Start the heartbeat monitoring service
  static startService() {
    if (HeartbeatService.isRunning) {
      console.log('🔄 Heartbeat service already running')
      return
    }

    console.log('💓 Starting heartbeat monitoring service...')
    HeartbeatService.isRunning = true

    // Run initial check
    HeartbeatService.markOfflineDevices()

    // Set up periodic checking
    HeartbeatService.intervalId = setInterval(() => {
      HeartbeatService.markOfflineDevices()
    }, HeartbeatService.getInstance().offlineCheckInterval)

    console.log('✅ Heartbeat service started')
  }

  // Stop the heartbeat monitoring service
  static stopService() {
    if (!HeartbeatService.isRunning) {
      return
    }

    console.log('⏹️ Stopping heartbeat monitoring service...')
    
    if (HeartbeatService.intervalId) {
      clearInterval(HeartbeatService.intervalId)
      HeartbeatService.intervalId = null
    }

    HeartbeatService.isRunning = false
    console.log('✅ Heartbeat service stopped')
  }

  // Mark devices as offline if they haven't sent heartbeat
  static async markOfflineDevices() {
    try {
      console.log('🔍 Checking for offline devices...')
      
      const { data, error } = await supabase.rpc('mark_offline_devices')
      
      if (error) {
        console.error('❌ Error marking offline devices:', error)
        return { success: false, error }
      }

      const result = data || {}
      console.log(`📊 Offline check completed: ${result.devices_marked_offline || 0} devices marked offline`)

      // Notify all registered callbacks
      HeartbeatService.callbacks.forEach(callback => {
        try {
          callback({
            type: 'offline_check_completed',
            devicesMarkedOffline: result.devices_marked_offline || 0,
            timestamp: new Date()
          })
        } catch (err) {
          console.error('Error in heartbeat callback:', err)
        }
      })

      return { success: true, data: result }
    } catch (err) {
      console.error('❌ Exception in markOfflineDevices:', err)
      return { success: false, error: err }
    }
  }

  // Register callback for heartbeat events
  static onHeartbeatEvent(callback) {
    if (typeof callback === 'function') {
      HeartbeatService.callbacks.add(callback)
      
      // Return cleanup function
      return () => {
        HeartbeatService.callbacks.delete(callback)
      }
    }
  }

  // Get device heartbeat status
  static async getDeviceHeartbeatStatus(deviceId) {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('device_id, device_name, is_online, last_heartbeat')
        .eq('device_id', deviceId)
        .single()

      if (error) {
        console.error('Error fetching heartbeat status:', error)
        return { success: false, error }
      }

      const now = new Date()
      const lastHeartbeat = new Date(data.last_heartbeat)
      const secondsSinceHeartbeat = Math.floor((now - lastHeartbeat) / 1000)

      return {
        success: true,
        data: {
          ...data,
          secondsSinceHeartbeat,
          isStale: secondsSinceHeartbeat > 120 // More than 2 minutes
        }
      }
    } catch (err) {
      console.error('Exception in getDeviceHeartbeatStatus:', err)
      return { success: false, error: err }
    }
  }

  // Get all devices with heartbeat information
  static async getAllDevicesHeartbeatStatus(userId) {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', userId)
        .order('last_heartbeat', { ascending: false })

      if (error) {
        console.error('Error fetching all devices heartbeat status:', error)
        return { success: false, error }
      }

      const now = new Date()
      const devicesWithStatus = data.map(device => {
        const lastHeartbeat = new Date(device.last_heartbeat)
        const secondsSinceHeartbeat = Math.floor((now - lastHeartbeat) / 1000)
        
        return {
          ...device,
          secondsSinceHeartbeat,
          isStale: secondsSinceHeartbeat > 120,
          heartbeatStatus: secondsSinceHeartbeat > 120 ? 'stale' : 'fresh'
        }
      })

      return {
        success: true,
        data: devicesWithStatus
      }
    } catch (err) {
      console.error('Exception in getAllDevicesHeartbeatStatus:', err)
      return { success: false, error: err }
    }
  }

  // Force a heartbeat for a specific device (for testing)
  static async forceHeartbeat(deviceId) {
    try {
      console.log(`💓 Forcing heartbeat for device: ${deviceId}`)
      
      const { data, error } = await supabase.rpc('update_device_heartbeat', {
        device_id_param: deviceId
      })

      if (error) {
        console.error('Error forcing heartbeat:', error)
        return { success: false, error }
      }

      console.log('✅ Heartbeat forced successfully:', data)
      return { success: true, data }
    } catch (err) {
      console.error('Exception in forceHeartbeat:', err)
      return { success: false, error: err }
    }
  }

  // Get heartbeat statistics
  static async getHeartbeatStats(userId) {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('is_online, last_heartbeat')
        .eq('user_id', userId)

      if (error) {
        console.error('Error fetching heartbeat stats:', error)
        return { success: false, error }
      }

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
  }

  // Subscribe to real-time heartbeat changes
  static subscribeToHeartbeatChanges(userId, callback) {
    const channel = supabase
      .channel('heartbeat_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'devices',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const device = payload.new
          const now = new Date()
          const lastHeartbeat = new Date(device.last_heartbeat)
          const secondsSinceHeartbeat = Math.floor((now - lastHeartbeat) / 1000)

          callback({
            type: 'heartbeat_update',
            device: {
              ...device,
              secondsSinceHeartbeat,
              isStale: secondsSinceHeartbeat > 120
            }
          })
        }
      )
      .subscribe()

    return channel
  }

  // Check service health
  static isServiceHealthy() {
    return {
      isRunning: HeartbeatService.isRunning,
      intervalActive: HeartbeatService.intervalId !== null,
      callbacksRegistered: HeartbeatService.callbacks.size,
      lastCheck: new Date()
    }
  }

  // Get configuration
  static getConfig() {
    const instance = HeartbeatService.getInstance()
    return {
      offlineCheckInterval: instance.offlineCheckInterval,
      heartbeatTimeout: instance.heartbeatTimeout,
      isRunning: HeartbeatService.isRunning
    }
  }

  // Update configuration
  static updateConfig(config) {
    const instance = HeartbeatService.getInstance()
    
    if (config.offlineCheckInterval) {
      instance.offlineCheckInterval = config.offlineCheckInterval
    }
    
    if (config.heartbeatTimeout) {
      instance.heartbeatTimeout = config.heartbeatTimeout
    }

    // Restart service with new config if it's running
    if (HeartbeatService.isRunning) {
      HeartbeatService.stopService()
      HeartbeatService.startService()
    }

    console.log('✅ Heartbeat service configuration updated:', instance)
  }
}

// Utility functions for heartbeat management
export const HeartbeatUtils = {
  // Format time since last heartbeat
  formatTimeSinceHeartbeat: (seconds) => {
    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  },

  // Get heartbeat status color
  getHeartbeatStatusColor: (secondsSinceHeartbeat, isOnline) => {
    if (!isOnline) return '#ef4444' // red
    if (secondsSinceHeartbeat <= 60) return '#22c55e' // green
    if (secondsSinceHeartbeat <= 120) return '#f59e0b' // yellow
    return '#ef4444' // red
  },

  // Get heartbeat status text
  getHeartbeatStatusText: (secondsSinceHeartbeat, isOnline) => {
    if (!isOnline) return 'Offline'
    if (secondsSinceHeartbeat <= 60) return 'Online'
    if (secondsSinceHeartbeat <= 120) return 'Stale'
    return 'Offline'
  },

  // Get heartbeat icon
  getHeartbeatIcon: (secondsSinceHeartbeat, isOnline) => {
    if (!isOnline) return '🔴'
    if (secondsSinceHeartbeat <= 60) return '🟢'
    if (secondsSinceHeartbeat <= 120) return '🟡'
    return '🔴'
  },

  // Check if device needs attention
  needsAttention: (secondsSinceHeartbeat, isOnline) => {
    return !isOnline || secondsSinceHeartbeat > 120
  },

  // Generate heartbeat report
  generateHeartbeatReport: (devices) => {
    const now = new Date()
    const report = {
      totalDevices: devices.length,
      healthyDevices: 0,
      staleDevices: 0,
      offlineDevices: 0,
      devicesNeedingAttention: [],
      avgHeartbeatAge: 0,
      generatedAt: now
    }

    let totalAge = 0

    devices.forEach(device => {
      const lastHeartbeat = new Date(device.last_heartbeat)
      const secondsSinceHeartbeat = Math.floor((now - lastHeartbeat) / 1000)
      
      totalAge += secondsSinceHeartbeat

      if (device.is_online && secondsSinceHeartbeat <= 60) {
        report.healthyDevices++
      } else if (device.is_online && secondsSinceHeartbeat <= 120) {
        report.staleDevices++
        report.devicesNeedingAttention.push({
          deviceId: device.device_id,
          deviceName: device.device_name,
          issue: 'Stale heartbeat',
          secondsSinceHeartbeat
        })
      } else {
        report.offlineDevices++
        report.devicesNeedingAttention.push({
          deviceId: device.device_id,
          deviceName: device.device_name,
          issue: 'Offline',
          secondsSinceHeartbeat
        })
      }
    })

    report.avgHeartbeatAge = devices.length > 0 ? Math.floor(totalAge / devices.length) : 0
    report.healthPercentage = devices.length > 0 ? Math.round((report.healthyDevices / devices.length) * 100) : 0

    return report
  }
}

export default HeartbeatService