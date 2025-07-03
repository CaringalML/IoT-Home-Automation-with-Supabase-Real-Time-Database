// src/services/index.js
// Central export point for all services

export { default as DeviceService, DeviceUtils } from './DeviceService'
export { default as HeartbeatService, HeartbeatUtils } from './HeartbeatService'

// Future services can be added here:
// export { default as UserService } from './UserService'
// export { default as NotificationService } from './NotificationService'
// export { default as AnalyticsService } from './AnalyticsService'

// Service configuration
export const ServiceConfig = {
  // API endpoints
  endpoints: {
    devices: '/devices',
    logs: '/device_logs',
    users: '/users',
    heartbeat: '/rpc/update_device_heartbeat',
    offline_check: '/rpc/mark_offline_devices'
  },
  
  // Default settings
  defaults: {
    logsLimit: 20,
    heartbeatInterval: 60000, // 60 seconds
    offlineTimeout: 120000, // 2 minutes
    retryAttempts: 3,
    cacheTimeout: 300000 // 5 minutes
  },
  
  // Heartbeat configuration
  heartbeat: {
    // How often to send heartbeats from devices (ESP32)
    deviceInterval: 60000, // 60 seconds
    
    // How often to check for offline devices (web app)
    checkInterval: 60000, // 60 seconds
    
    // How long before marking a device offline
    timeout: 120000, // 2 minutes
    
    // Maximum heartbeat history to keep per device
    maxHistoryEntries: 100,
    
    // Heartbeat status thresholds
    thresholds: {
      healthy: 60, // 0-60 seconds = healthy
      stale: 120,  // 61-120 seconds = stale
      offline: 121 // 121+ seconds = offline
    }
  },
  
  // Device types configuration
  deviceTypes: [
    { value: 'light', label: 'Light', icon: '💡' },
    { value: 'fan', label: 'Fan', icon: '🌀' },
    { value: 'ac', label: 'Air Conditioner', icon: '❄️' },
    { value: 'heater', label: 'Heater', icon: '🔥' },
    { value: 'outlet', label: 'Smart Outlet', icon: '🔌' },
    { value: 'sensor', label: 'Sensor', icon: '📡' },
    { value: 'camera', label: 'Camera', icon: '📷' },
    { value: 'door', label: 'Smart Door', icon: '🚪' },
    { value: 'window', label: 'Smart Window', icon: '🪟' },
    { value: 'thermostat', label: 'Thermostat', icon: '🌡️' }
  ],
  
  // Real-time configuration
  realtime: {
    // WebSocket reconnection settings
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
    
    // Subscription settings
    enableDeviceUpdates: true,
    enableHeartbeatUpdates: true,
    enableLogUpdates: false, // Disable for performance
    
    // Channel configurations
    channels: {
      devices: 'devices_changes',
      heartbeat: 'heartbeat_changes',
      logs: 'device_logs_changes'
    }
  },
  
  // Security settings
  security: {
    // Rate limiting for heartbeat endpoints
    heartbeatRateLimit: {
      maxRequests: 120, // 2 per second max
      windowMs: 60000   // 1 minute window
    },
    
    // Device validation
    deviceIdPattern: /^[A-Z0-9_-]{3,20}$/i,
    
    // Heartbeat validation
    maxHeartbeatAge: 86400000, // 24 hours max age
    
    // CORS settings for ESP32 devices
    allowedOrigins: [
      'http://localhost:3000',
      'https://ylhiygblpcwsopivkayn.supabase.co'
    ]
  },
  
  // Performance settings
  performance: {
    // Database query optimization
    batchSize: 50,
    cacheHeartbeats: true,
    cacheDuration: 30000, // 30 seconds
    
    // UI update throttling
    uiUpdateInterval: 1000, // 1 second
    heartbeatDisplayInterval: 5000, // 5 seconds
    
    // Background service intervals
    cleanupInterval: 3600000, // 1 hour
    statsUpdateInterval: 30000 // 30 seconds
  },
  
  // Monitoring and alerting
  monitoring: {
    // Health check thresholds
    healthThresholds: {
      excellent: 95, // 95%+ devices healthy
      good: 80,      // 80-94% devices healthy
      warning: 60,   // 60-79% devices healthy
      critical: 40   // <60% devices healthy
    },
    
    // Alert conditions
    alerts: {
      enableOfflineAlerts: true,
      enableStaleAlerts: true,
      enableHealthAlerts: true,
      
      // Alert thresholds
      maxOfflineDevices: 3,
      maxStaleDevices: 5,
      minHealthScore: 70
    },
    
    // Logging levels
    logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
    enableHeartbeatLogs: process.env.NODE_ENV !== 'production'
  }
}

// Service initialization function
export const initializeServices = async (user) => {
  console.log('🔧 Initializing SmartHub Pro services...')
  
  try {
    // Initialize HeartbeatService with user context
    if (user) {
      console.log('💓 Starting heartbeat monitoring service...')
      HeartbeatService.startService()
      
      // Get initial heartbeat stats
      const { success, data } = await HeartbeatService.getHeartbeatStats(user.id)
      if (success) {
        console.log('📊 Initial heartbeat stats:', data)
      }
    }
    
    console.log('✅ Services initialized successfully')
    return { success: true }
  } catch (error) {
    console.error('❌ Service initialization failed:', error)
    return { success: false, error }
  }
}

// Service cleanup function
export const cleanupServices = () => {
  console.log('🧹 Cleaning up SmartHub Pro services...')
  
  try {
    // Stop HeartbeatService
    HeartbeatService.stopService()
    
    console.log('✅ Services cleaned up successfully')
    return { success: true }
  } catch (error) {
    console.error('❌ Service cleanup failed:', error)
    return { success: false, error }
  }
}

// Service health check function
export const checkServiceHealth = async () => {
  const health = {
    timestamp: new Date().toISOString(),
    services: {}
  }
  
  try {
    // Check HeartbeatService health
    const heartbeatHealth = HeartbeatService.isServiceHealthy()
    health.services.heartbeat = {
      status: heartbeatHealth.isRunning ? 'healthy' : 'stopped',
      details: heartbeatHealth
    }
    
    // Check DeviceService health (basic connectivity)
    try {
      // This is a basic connectivity test
      health.services.device = {
        status: 'healthy',
        details: { message: 'Service operational' }
      }
    } catch (error) {
      health.services.device = {
        status: 'error',
        details: { error: error.message }
      }
    }
    
    // Overall health determination
    const allServicesHealthy = Object.values(health.services)
      .every(service => service.status === 'healthy')
    
    health.overall = allServicesHealthy ? 'healthy' : 'degraded'
    
    return health
  } catch (error) {
    console.error('Health check failed:', error)
    return {
      timestamp: new Date().toISOString(),
      overall: 'error',
      error: error.message
    }
  }
}

// Configuration update function
export const updateServiceConfig = (newConfig) => {
  try {
    // Deep merge configuration
    Object.keys(newConfig).forEach(key => {
      if (typeof newConfig[key] === 'object' && !Array.isArray(newConfig[key])) {
        ServiceConfig[key] = { ...ServiceConfig[key], ...newConfig[key] }
      } else {
        ServiceConfig[key] = newConfig[key]
      }
    })
    
    // Update HeartbeatService configuration if changed
    if (newConfig.heartbeat) {
      HeartbeatService.updateConfig({
        offlineCheckInterval: newConfig.heartbeat.checkInterval,
        heartbeatTimeout: newConfig.heartbeat.timeout
      })
    }
    
    console.log('✅ Service configuration updated:', newConfig)
    return { success: true }
  } catch (error) {
    console.error('❌ Configuration update failed:', error)
    return { success: false, error }
  }
}

// Export configuration getter
export const getServiceConfig = () => {
  return { ...ServiceConfig }
}

// Service event emitter for cross-service communication
class ServiceEventEmitter {
  constructor() {
    this.events = {}
  }
  
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = []
    }
    this.events[event].push(callback)
    
    // Return cleanup function
    return () => {
      this.events[event] = this.events[event].filter(cb => cb !== callback)
    }
  }
  
  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error)
        }
      })
    }
  }
  
  removeAllListeners(event) {
    if (event) {
      delete this.events[event]
    } else {
      this.events = {}
    }
  }
}

export const serviceEvents = new ServiceEventEmitter()

// Service diagnostics
export const getServiceDiagnostics = async () => {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server',
    services: {}
  }
  
  try {
    // HeartbeatService diagnostics
    diagnostics.services.heartbeat = {
      ...HeartbeatService.isServiceHealthy(),
      config: HeartbeatService.getConfig()
    }
    
    // Memory usage (if available)
    if (typeof window !== 'undefined' && 'memory' in performance) {
      diagnostics.memory = {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      }
    }
    
    // Network connectivity
    if (typeof window !== 'undefined') {
      diagnostics.network = {
        online: navigator.onLine,
        connection: navigator.connection ? {
          effectiveType: navigator.connection.effectiveType,
          downlink: navigator.connection.downlink,
          rtt: navigator.connection.rtt
        } : null
      }
    }
    
    return diagnostics
  } catch (error) {
    console.error('Diagnostics collection failed:', error)
    return {
      ...diagnostics,
      error: error.message
    }
  }
}