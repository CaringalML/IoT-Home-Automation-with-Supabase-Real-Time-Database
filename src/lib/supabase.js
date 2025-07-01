import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Validate that we're using HTTPS in production
if (process.env.NODE_ENV === 'production' && !supabaseUrl.startsWith('https://')) {
  throw new Error('Supabase URL must use HTTPS in production')
}

// Enhanced Supabase client configuration for security
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Enhanced security settings
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Use secure storage in production
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    flowType: 'pkce' // Use PKCE flow for enhanced security
  },
  realtime: {
    // Enhanced WebSocket security
    params: {
      apikey: supabaseAnonKey,
    },
    // Ensure secure WebSocket connections
    heartbeatIntervalMs: 30000,
    reconnectDelayMs: 1000,
    timeout: 20000
  },
  global: {
    headers: {
      'X-Client-Info': 'smarthub-pro-iot-app',
      'User-Agent': 'SmartHub-Pro/1.0.0'
    }
  },
  db: {
    schema: 'public'
  }
})

// Connection state monitoring
let connectionState = 'connecting'

// Monitor connection state using channel events instead of direct realtime events
const monitorConnection = () => {
  const channel = supabase.channel('connection-monitor')
  
  channel
    .on('presence', { event: 'sync' }, () => {
      connectionState = 'connected'
      console.log('✅ Supabase connection established')
    })
    .on('presence', { event: 'join' }, () => {
      connectionState = 'connected'
      console.log('✅ Supabase connection restored')
    })
    .on('presence', { event: 'leave' }, () => {
      connectionState = 'disconnected'
      console.log('⚠️ Supabase connection lost')
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        connectionState = 'connected'
        console.log('✅ Supabase realtime connected')
      } else if (status === 'CHANNEL_ERROR') {
        connectionState = 'error'
        console.error('❌ Supabase connection error')
      } else if (status === 'TIMED_OUT') {
        connectionState = 'timeout'
        console.warn('⏰ Supabase connection timeout')
      } else if (status === 'CLOSED') {
        connectionState = 'disconnected'
        console.log('🔌 Supabase connection closed')
      }
    })

  return channel
}

// Initialize connection monitoring
let connectionChannel = null
if (typeof window !== 'undefined') {
  connectionChannel = monitorConnection()
}

// Export connection state checker
export const getConnectionState = () => connectionState

// Export utility function to check connection
export const checkConnection = async () => {
  try {
    const { error } = await supabase.from('devices').select('count', { count: 'exact', head: true })
    if (error) throw error
    connectionState = 'connected'
    return true
  } catch (error) {
    connectionState = 'error'
    console.error('Connection check failed:', error)
    return false
  }
}

// Export utility function to check if we're in secure context
export const isSecureContext = () => {
  if (typeof window === 'undefined') return true // Server-side is considered secure
  
  // Check if we're in a secure context (HTTPS or localhost)
  return window.isSecureContext || 
         window.location.protocol === 'https:' || 
         window.location.hostname === 'localhost' ||
         window.location.hostname === '127.0.0.1'
}

// Cleanup function for connection monitoring
export const cleanupConnection = () => {
  if (connectionChannel) {
    supabase.removeChannel(connectionChannel)
    connectionChannel = null
  }
}

// Validate secure context on initialization
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  if (!isSecureContext()) {
    console.error('⚠️ Application must be served over HTTPS in production')
  }
}