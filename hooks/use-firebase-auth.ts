"use client"

import { useState, useCallback } from "react"
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth"
import { getFirebaseAuth, isFirebaseInitialized } from "@/lib/firebase"

export const useFirebaseAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(isFirebaseInitialized())

  // Setup auth state listener
  const setupAuthListener = useCallback(() => {
    if (!isFirebaseInitialized()) {
      setIsInitialized(false)
      return
    }

    const auth = getFirebaseAuth()
    if (!auth) {
      setIsInitialized(false)
      return
    }

    setIsInitialized(true)
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
    })

    return unsubscribe
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    if (!isFirebaseInitialized()) {
      setError("Firebase is not initialized")
      return false
    }

    setLoading(true)
    setError(null)

    try {
      const auth = getFirebaseAuth()
      if (!auth) throw new Error("Firebase Auth not available")

      await signInWithEmailAndPassword(auth, email, password)
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed"
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const signup = useCallback(async (email: string, password: string) => {
    if (!isFirebaseInitialized()) {
      setError("Firebase is not initialized")
      return false
    }

    setLoading(true)
    setError(null)

    try {
      const auth = getFirebaseAuth()
      if (!auth) throw new Error("Firebase Auth not available")

      await createUserWithEmailAndPassword(auth, email, password)
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Signup failed"
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    if (!isFirebaseInitialized()) {
      setError("Firebase is not initialized")
      return false
    }

    setLoading(true)
    setError(null)

    try {
      const auth = getFirebaseAuth()
      if (!auth) throw new Error("Firebase Auth not available")

      await signOut(auth)
      setUser(null)
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Logout failed"
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    user,
    loading,
    error,
    isInitialized,
    login,
    signup,
    logout,
    setupAuthListener,
  }
}
