// Firebase service for real-time data operations with error handling
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  Timestamp,
} from "firebase/firestore"
import { getFirebaseDB } from "./firebase"
import type { Transaction } from "./types"

export class FirebaseService {
  private static checkDatabase() {
    const db = getFirebaseDB()
    if (!db) {
      throw new Error("Firestore is not available. Please check your Firebase configuration.")
    }
    return db
  }

  // Add a new transaction
  static async addTransaction(
    userId: string,
    transaction: Omit<Transaction, "id" | "userId" | "createdAt" | "updatedAt">,
  ) {
    try {
      const db = this.checkDatabase()
      const docRef = await addDoc(collection(db, "transactions"), {
        ...transaction,
        userId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
      return docRef.id
    } catch (error) {
      console.error("Error adding transaction:", error)
      throw error
    }
  }

  // Update an existing transaction
  static async updateTransaction(transactionId: string, updates: Partial<Transaction>) {
    try {
      const db = this.checkDatabase()
      const transactionRef = doc(db, "transactions", transactionId)
      await updateDoc(transactionRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      })
    } catch (error) {
      console.error("Error updating transaction:", error)
      throw error
    }
  }

  // Delete a transaction
  static async deleteTransaction(transactionId: string) {
    try {
      const db = this.checkDatabase()
      await deleteDoc(doc(db, "transactions", transactionId))
    } catch (error) {
      console.error("Error deleting transaction:", error)
      throw error
    }
  }

  // Get transactions for a user (one-time fetch)
  static async getTransactions(userId: string): Promise<Transaction[]> {
    try {
      const db = this.checkDatabase()
      const q = query(collection(db, "transactions"), where("userId", "==", userId), orderBy("date", "desc"))
      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      })) as Transaction[]
    } catch (error) {
      console.error("Error getting transactions:", error)
      throw error
    }
  }

  // Subscribe to real-time transaction updates
  static subscribeToTransactions(userId: string, callback: (transactions: Transaction[]) => void) {
    const db = this.checkDatabase()
    const q = query(collection(db, "transactions"), where("userId", "==", userId), orderBy("date", "desc"))

    return onSnapshot(
      q,
      (querySnapshot) => {
        const transactions = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        })) as Transaction[]

        callback(transactions)
      },
      (error) => {
        console.error("Error in transaction subscription:", error)
        callback([])
      },
    )
  }

  // Calculate analytics data from transactions
  static calculateAnalytics(transactions: Transaction[]) {
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()

    // Filter transactions for current month
    const currentMonthTransactions = transactions.filter((t) => {
      const transactionDate = new Date(t.date)
      return transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear
    })

    const totalIncome = currentMonthTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0)

    const totalExpenses = currentMonthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0)

    const balance = totalIncome - totalExpenses

    // Category breakdown
    const categoryBreakdown: { [key: string]: number } = {}
    currentMonthTransactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + t.amount
      })

    return {
      totalIncome,
      totalExpenses,
      balance,
      categoryBreakdown,
    }
  }

  // Get monthly trend data
  static getMonthlyTrend(transactions: Transaction[], months = 6) {
    const monthlyData: { [key: string]: { income: number; expenses: number } } = {}

    // Initialize last N months
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthKey = date.toLocaleDateString("en-US", { month: "short" })
      monthlyData[monthKey] = { income: 0, expenses: 0 }
    }

    // Aggregate transactions by month
    transactions.forEach((transaction) => {
      const transactionDate = new Date(transaction.date)
      const monthKey = transactionDate.toLocaleDateString("en-US", { month: "short" })

      if (monthlyData[monthKey]) {
        if (transaction.type === "income") {
          monthlyData[monthKey].income += transaction.amount
        } else {
          monthlyData[monthKey].expenses += transaction.amount
        }
      }
    })

    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      income: data.income,
      expenses: data.expenses,
    }))
  }
}
