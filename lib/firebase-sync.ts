import { getFirebaseDB, isFirebaseInitialized } from "./firebase"
import type { StorageData } from "./storage"
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore"

export interface SyncData {
  data: StorageData
  lastSyncedAt: string
  userId: string
}

export const firebaseSync = {
  // Save data to Firebase
  saveToFirebase: async (userId: string, data: StorageData): Promise<boolean> => {
    if (!isFirebaseInitialized()) {
      console.warn("[v0] Firebase not initialized, skipping sync")
      return false
    }

    try {
      const db = getFirebaseDB()
      if (!db) return false

      const syncData: SyncData = {
        data,
        lastSyncedAt: new Date().toISOString(),
        userId,
      }

      await setDoc(doc(db, "users", userId, "data", "expenseTrackerData"), {
        ...syncData,
        updatedAt: serverTimestamp(),
      })

      console.log("[v0] Data synced to Firebase successfully")
      return true
    } catch (error) {
      console.error("[v0] Error syncing to Firebase:", error)
      return false
    }
  },

  // Restore data from Firebase
  restoreFromFirebase: async (userId: string): Promise<StorageData | null> => {
    if (!isFirebaseInitialized()) {
      console.warn("[v0] Firebase not initialized, cannot restore")
      return null
    }

    try {
      const db = getFirebaseDB()
      if (!db) return null

      const docRef = doc(db, "users", userId, "data", "expenseTrackerData")
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const syncData = docSnap.data() as SyncData
        console.log("[v0] Data restored from Firebase successfully")
        return syncData.data
      } else {
        console.log("[v0] No data found in Firebase")
        return null
      }
    } catch (error) {
      console.error("[v0] Error restoring from Firebase:", error)
      return null
    }
  },

  // Check if user has data in Firebase
  hasDataInFirebase: async (userId: string): Promise<boolean> => {
    if (!isFirebaseInitialized()) return false

    try {
      const db = getFirebaseDB()
      if (!db) return false

      const docRef = doc(db, "users", userId, "data", "expenseTrackerData")
      const docSnap = await getDoc(docRef)
      return docSnap.exists()
    } catch (error) {
      console.error("[v0] Error checking Firebase data:", error)
      return false
    }
  },
}
