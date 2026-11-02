"use client"

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { onAuthStateChanged, User } from 'firebase/auth'
import { auth } from './config'
import {
  signInUser,
  signUpUser,
  signOutUser,
  sendPasswordReset,
  setSessionCookie,
  clearSessionCookie,
} from './auth'
import { getUserProfile, createUserProfile } from '@/services/users.service'
import type { UserProfile, UserRole } from '@/types'

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  signIn: (identifier: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName: string, role?: UserRole, username?: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  resetPassword: async () => {},
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = async () => {
    if (!auth.currentUser) {
      setUserProfile(null)
      return
    }
    const profile = await getUserProfile(auth.currentUser.uid)
    if (profile) {
      setUserProfile(profile)
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)

      if (currentUser) {
        setSessionCookie()
        try {
          let profile = await getUserProfile(currentUser.uid)
          if (!profile) {
            const cleanId = (currentUser.displayName || currentUser.email?.split('@')[0] || 'STAFF').toUpperCase()
            const fallbackEmail = currentUser.email || `${cleanId.toLowerCase()}@gmail.com`
            profile = await createUserProfile(currentUser.uid, {
              email: fallbackEmail,
              displayName: currentUser.displayName || cleanId || 'Staff Member',
              role: 'staff',
              userId: cleanId,
            })
          }
          setUserProfile(profile)
        } catch (err) {
          console.warn('[AuthContext] Error loading user profile:', err)
        }
      } else {
        clearSessionCookie()
        setUserProfile(null)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleSignIn = async (identifier: string, password: string) => {
    const { user: signedInUser, profile } = await signInUser(identifier, password)
    setUser(signedInUser)
    setUserProfile(profile)
  }

  const handleSignUp = async (
    email: string,
    password: string,
    displayName: string,
    role?: UserRole,
    username?: string
  ) => {
    const { user: signedUpUser, profile } = await signUpUser(
      email,
      password,
      displayName,
      role || 'staff',
      username
    )
    setUser(signedUpUser)
    setUserProfile(profile)
  }

  const handleSignOut = async () => {
    await signOutUser()
    setUser(null)
    setUserProfile(null)
  }

  const handleResetPassword = async (email: string) => {
    await sendPasswordReset(email)
  }

  const value = useMemo(
    () => ({
      user,
      userProfile,
      loading,
      signIn: handleSignIn,
      signUp: handleSignUp,
      signOut: handleSignOut,
      resetPassword: handleResetPassword,
      refreshProfile,
    }),
    [user, userProfile, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
