"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import {
  type User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth"
import { getFirebaseAuth, isFirebaseInitialized, getFirebaseError } from "./firebase"

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  firebaseError: string | null
  isFirebaseReady: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [firebaseError, setFirebaseError] = useState<string | null>(null)

  useEffect(() => {
    const auth = getFirebaseAuth()
    const error = getFirebaseError()

    if (error) {
      setFirebaseError(error)
      setLoading(false)
      return
    }

    if (!auth) {
      setFirebaseError("Firebase Auth not initialized")
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("[v0] Auth state changed:", user ? "User logged in" : "User logged out")
      setUser(user)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const signIn = async (email: string, password: string) => {
    const auth = getFirebaseAuth()
    if (!auth) {
      throw new Error("Firebase Auth not available. Please check your configuration.")
    }
    await signInWithEmailAndPassword(auth, email, password)
  }

  const signUp = async (email: string, password: string) => {
    const auth = getFirebaseAuth()
    if (!auth) {
      throw new Error("Firebase Auth not available. Please check your configuration.")
    }
    await createUserWithEmailAndPassword(auth, email, password)
  }

  const logout = async () => {
    const auth = getFirebaseAuth()
    if (!auth) {
      throw new Error("Firebase Auth not available. Please check your configuration.")
    }
    await signOut(auth)
  }

  const value = {
    user,
    loading,
    signIn,
    signUp,
    logout,
    firebaseError,
    isFirebaseReady: isFirebaseInitialized(),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
