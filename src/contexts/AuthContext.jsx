import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        }
      }
    })
    return { data, error }
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const resetPassword = async (email) => {
    // Use environment variable for production URL, fallback to current origin for development
    const redirectUrl = `${process.env.REACT_APP_SITE_URL || window.location.origin}/reset-password`
    
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    })
    return { data, error }
  }

  const updatePassword = async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    })
    return { data, error }
  }

  // New function to verify and set session from reset tokens
  const verifyResetToken = async (accessToken) => {
    try {
      console.log('=== AUTH CONTEXT DEBUG ===')
      console.log('Verifying reset token:', { accessToken: accessToken?.substring(0, 20) + '...' })
      
      // For password recovery, we don't need to verify the token with Supabase
      // The token will be validated when we actually try to update the password
      // Let's just check if the token looks valid (basic format check)
      
      if (!accessToken || accessToken.length < 10) {
        console.log('❌ Token appears invalid (too short)')
        return { success: false, error: 'Invalid token format' }
      }
      
      // Store the token temporarily so we can use it for password update
      console.log('✅ Token format appears valid, storing for password update')
      
      // We'll validate the actual token when updatePassword is called
      return { success: true, token: accessToken }
      
    } catch (err) {
      console.error('Token verification failed:', err)
      return { success: false, error: 'Invalid or expired reset token' }
    }
  }

  const updatePasswordWithToken = async (newPassword, resetToken) => {
    try {
      console.log('=== UPDATING PASSWORD WITH TOKEN ===')
      console.log('Reset token:', resetToken?.substring(0, 20) + '...')
      
      // For password recovery, we need to use verifyOtp instead of setSession
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: resetToken,
        type: 'recovery'
      })
      
      if (error) {
        console.error('Token verification error:', error)
        return { error }
      }
      
      console.log('✅ Token verified successfully, user session established')
      console.log('Session data:', data)
      
      // Now that we have a valid session, update the password
      console.log('Updating password...')
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })
      
      if (updateError) {
        console.error('Password update error:', updateError)
        return { error: updateError }
      }
      
      console.log('✅ Password updated successfully!')
      return { data: updateData, error: null }
      
    } catch (err) {
      console.error('Password update failed:', err)
      return { error: { message: 'Failed to update password' } }
    }
  }

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    verifyResetToken,
    updatePasswordWithToken,
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}