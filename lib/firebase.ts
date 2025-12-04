import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app"
import { getAuth, type Auth } from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
}

const isValidConfig = Object.values(firebaseConfig).every((value) => value && value.length > 0)

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null
let initializationError: string | null = null

if (!isValidConfig) {
  initializationError =
    "Firebase configuration incomplete. Please set all NEXT_PUBLIC_FIREBASE_* environment variables."
  console.warn("[v0] Firebase Config Error:", initializationError)
} else {
  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig)
    } else {
      app = getApp()
    }

    try {
      auth = getAuth(app)
    } catch (authError) {
      console.error("[v0] Failed to initialize Firebase Auth:", authError)
      initializationError = "Firebase Auth initialization failed"
    }

    try {
      db = getFirestore(app)
    } catch (dbError) {
      console.error("[v0] Failed to initialize Firestore:", dbError)
      if (!initializationError) {
        initializationError = "Firestore initialization failed"
      }
    }
  } catch (error) {
    console.error("[v0] Failed to initialize Firebase app:", error)
    initializationError = "Firebase app initialization failed"
  }
}

export const getFirebaseAuth = (): Auth | null => {
  return auth
}

export const getFirebaseDB = (): Firestore | null => {
  return db
}

export const isFirebaseInitialized = (): boolean => {
  return !!(app && auth && db && !initializationError)
}

export const getFirebaseError = (): string | null => {
  return initializationError
}

export { auth, db }
export default app
