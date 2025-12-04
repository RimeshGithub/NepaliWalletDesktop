"use client"

import { useEffect, useCallback } from "react"
import { useFirebaseSync } from "./use-firebase-sync"

let syncTimeout: NodeJS.Timeout | null = null

export const useStorageSync = (userId: string | null) => {
  const { syncData, isOnline } = useFirebaseSync(userId)

  const triggerSync = useCallback(() => {
    if (!userId || !isOnline) return

    // Clear existing timeout
    if (syncTimeout) {
      clearTimeout(syncTimeout)
    }

    // Debounce sync by 2 seconds to batch multiple changes
    syncTimeout = setTimeout(() => {
      syncData()
    }, 2000)
  }, [userId, isOnline, syncData])

  useEffect(() => {
    const handleStorageChange = () => {
      triggerSync()
    }

    window.addEventListener("storage", handleStorageChange)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      if (syncTimeout) {
        clearTimeout(syncTimeout)
      }
    }
  }, [triggerSync])

  return { triggerSync }
}
