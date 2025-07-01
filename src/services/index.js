// src/services/index.js
// Central export point for all services

export { default as DeviceService, DeviceUtils } from './DeviceService'

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
    users: '/users'
  },
  
  // Default settings
  defaults: {
    logsLimit: 20,
    heartbeatInterval: 30000,
    retryAttempts: 3,
    cacheTimeout: 300000 // 5 minutes
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
  ]
}