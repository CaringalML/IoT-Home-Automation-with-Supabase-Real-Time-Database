// src/services/types.js
// Type definitions and interfaces for better code documentation

/**
 * @typedef {Object} Device
 * @property {string} id - Unique device identifier (UUID)
 * @property {string} user_id - User who owns the device
 * @property {string} device_id - Hardware device identifier
 * @property {string} device_name - Human-readable device name
 * @property {string} device_type - Type of device (light, fan, etc.)
 * @property {string} location - Physical location of device
 * @property {boolean} is_online - Whether device is currently online
 * @property {number} status - Device status (0=OFF, 1=ON)
 * @property {string} qr_code - QR code data for setup
 * @property {string} created_at - Creation timestamp
 * @property {string} updated_at - Last update timestamp
 */

/**
 * @typedef {Object} DeviceInput
 * @property {string} device_id - Hardware device identifier
 * @property {string} device_name - Human-readable device name
 * @property {string} device_type - Type of device
 * @property {string} location - Physical location
 * @property {string} [qr_code] - Optional QR code data
 */

/**
 * @typedef {Object} DeviceLog
 * @property {string} id - Log entry identifier
 * @property {string} device_id - Associated device ID
 * @property {string} user_id - User who performed action
 * @property {string} action - Action performed (turn_on, turn_off, etc.)
 * @property {number} [old_status] - Previous status value
 * @property {number} [new_status] - New status value
 * @property {string} timestamp - When action occurred
 */

/**
 * @typedef {Object} DeviceStats
 * @property {number} total - Total number of devices
 * @property {number} online - Number of online devices
 * @property {number} offline - Number of offline devices
 * @property {number} active - Number of active (ON) devices
 * @property {number} inactive - Number of inactive (OFF) devices
 * @property {Object} byType - Count by device type
 * @property {Object} byLocation - Count by location
 */

/**
 * @typedef {Object} ServiceResponse
 * @property {*} [data] - Response data
 * @property {Error} [error] - Error object if operation failed
 */

/**
 * Device status constants
 */
export const DEVICE_STATUS = {
  OFF: 0,
  ON: 1
}

/**
 * Device action types
 */
export const DEVICE_ACTIONS = {
  TURN_ON: 'turn_on',
  TURN_OFF: 'turn_off',
  CREATED: 'created',
  UPDATED: 'updated',
  DELETED: 'deleted',
  STATUS_CHANGE: 'status_change'
}

/**
 * Device types
 */
export const DEVICE_TYPES = {
  LIGHT: 'light',
  FAN: 'fan',
  AC: 'ac',
  HEATER: 'heater',
  OUTLET: 'outlet',
  SENSOR: 'sensor',
  CAMERA: 'camera',
  DOOR: 'door',
  WINDOW: 'window',
  THERMOSTAT: 'thermostat'
}

/**
 * Validation schemas
 */
export const ValidationSchemas = {
  deviceInput: {
    device_id: {
      required: true,
      pattern: /^[A-Z0-9_-]{3,20}$/i,
      message: 'Device ID must be 3-20 characters, letters, numbers, underscore, or hyphen only'
    },
    device_name: {
      required: true,
      minLength: 1,
      maxLength: 100,
      message: 'Device name is required and must be less than 100 characters'
    },
    device_type: {
      required: true,
      enum: Object.values(DEVICE_TYPES),
      message: 'Please select a valid device type'
    },
    location: {
      required: true,
      minLength: 1,
      maxLength: 100,
      message: 'Location is required and must be less than 100 characters'
    }
  }
}

/**
 * Error codes and messages
 */
export const ERROR_CODES = {
  DEVICE_NOT_FOUND: 'DEVICE_NOT_FOUND',
  DEVICE_OFFLINE: 'DEVICE_OFFLINE',
  DUPLICATE_DEVICE_ID: 'DUPLICATE_DEVICE_ID',
  INVALID_STATUS: 'INVALID_STATUS',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR'
}

export const ERROR_MESSAGES = {
  [ERROR_CODES.DEVICE_NOT_FOUND]: 'Device not found',
  [ERROR_CODES.DEVICE_OFFLINE]: 'Device is currently offline',
  [ERROR_CODES.DUPLICATE_DEVICE_ID]: 'Device ID already exists',
  [ERROR_CODES.INVALID_STATUS]: 'Invalid device status',
  [ERROR_CODES.PERMISSION_DENIED]: 'Permission denied',
  [ERROR_CODES.NETWORK_ERROR]: 'Network connection error',
  [ERROR_CODES.VALIDATION_ERROR]: 'Validation failed'
}