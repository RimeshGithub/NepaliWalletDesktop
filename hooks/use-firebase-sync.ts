"use client"

import { useEffect, useCallback, useState } from "react"
import { firebaseSync } from "@/lib/firebase-sync"
import { storage } from "@/lib/storage"
import { getFirebaseDB, isFirebaseInitialized } from "@/lib/firebase"
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore"
import { Network } from '@capacitor/network'

export const useFirebaseSync = (userId: string | null) => {
  const [isSyncing, setIsSyncing] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)

  const getSyncTime = async () => {
    if(userId && isFirebaseInitialized() && isOnline) {
      const db = getFirebaseDB()
      if (!db) return null

      const docRef = doc(db, "users", userId, "data", "expenseTrackerData")
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const syncData = docSnap.data() 
        setLastSyncTime(syncData.lastSyncedAt)
      }
    }
  }

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    async function initNetworkListeners() {
      const status = await Network.getStatus()
      if (status.connected) {
        handleOnline()
      } else {
        handleOffline()
      }
      
      // Listen for changes
      Network.addListener('networkStatusChange', (status) => {
        if (status.connected) {
          handleOnline()
        } else {
          handleOffline()
        }
      })
    }

    initNetworkListeners()
    getSyncTime()

    return () => {
      Network.removeAllListeners()
    }
  }, [userId])

  useEffect(() => {
    const unsubscribe = storage.onChange(() => {
      getSyncTime()
    })
    return unsubscribe
  }, [userId])

  // Auto-sync when data changes and user is logged in
  const syncData = useCallback(async () => {
    if (!userId || !isOnline || !isFirebaseInitialized()) {
      return false
    }

    setIsSyncing(true)
    setSyncError(null)

    try {
      const data = storage.getData()
      const empty = data.transactions.length === 0 && data.customCategories.length === 0 && data.customAccounts.length === 0

      if (!empty) {
        const success = await firebaseSync.saveToFirebase(userId, data)

        if (!success) {
          setSyncError("Failed to sync data")
          return false
        }
        setLastSyncTime(new Date().toISOString())
        return true
      } 
      else { 
        setSyncError("No data to sync")
        return false
      } 
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Sync failed"
      setSyncError(errorMessage)
      return false
    } finally {
      setIsSyncing(false)
    }
  }, [userId, isOnline])

  // Restore data from Firebase
  const restoreData = useCallback(async () => {
    if (!userId || !isFirebaseInitialized()) {
      setSyncError("Cannot restore: Cloud not initialized or user not logged in")
      return false
    }

    setIsRestoring(true)
    setSyncError(null)

    try {
      const restoredData = await firebaseSync.restoreFromFirebase(userId)

      if (restoredData) {
        storage.saveData(restoredData)
        return true
      } else {
        setSyncError("No data found in Cloud to restore")
        return false
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Restore failed"
      setSyncError(errorMessage)
      return false
    } finally {
      setIsRestoring(false)
    }
  }, [userId])

  return {
    isSyncing,
    isRestoring,
    lastSyncTime,
    syncError,
    isOnline,
    syncData,
    restoreData,
  }
}
