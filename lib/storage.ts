import { parse } from "path"
import { type Transaction, type Category, type Account, EXPENSE_CATEGORIES, INCOME_CATEGORIES, ACCOUNTS } from "./types"

const STORAGE_KEY = "expenseTrackerData"

export interface StorageData {
  transactions: Transaction[]
  customCategories: Category[],
  customAccounts: Account[],
  settings: {
    currency: string
    autoSync: boolean
  }
}

const defaultData: StorageData = {
  transactions: [],
  customCategories: [],
  customAccounts: [],
  settings: {
    currency: "Rs",
    autoSync: false,
  },
}

// 🔥 Listeners that should be notified when storage changes
const listeners: (() => void)[] = []

// 🔥 Helper: Notify all listeners
function notifyListeners() {
  listeners.forEach((cb) => {
    try {
      cb()
    } catch (err) {
      console.error("Storage listener error:", err)
    }
  })
}

export const storage = {
  // Get all data from localStorage
  getData: (): StorageData => {
    if (typeof window === "undefined") return defaultData
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      return data ? JSON.parse(data) : defaultData
    } catch (error) {
      console.error("Error reading from localStorage:", error)
      return defaultData
    }
  },

  // Save all data to localStorage
  saveData: (data: StorageData): void => {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      notifyListeners() // ✅ Notify after saving
    } catch (error) {
      console.error("Error saving to localStorage:", error)
    }
  },

  // Add a new transaction
  addTransaction: (transaction: Omit<Transaction, "id" | "userId" | "createdAt" | "updatedAt">): Transaction => {
    const data = storage.getData()
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString() + (Math.random() * 10000).toFixed(0),
      userId: "local-user",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    data.transactions.push(newTransaction)
    storage.saveData(data)
    return newTransaction
  },

  // Update a transaction
  updateTransaction: (id: string, updates: Partial<Transaction>): Transaction | null => {
    const data = storage.getData()
    const index = data.transactions.findIndex((t) => t.id === id)
    if (index === -1) return null
    data.transactions[index] = {
      ...data.transactions[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    storage.saveData(data)
    return data.transactions[index]
  },

  // Delete a transaction
  deleteTransaction: (id: string): boolean => {
    const data = storage.getData()
    const index = data.transactions.findIndex((t) => t.id === id)
    if (index === -1) return false
    data.transactions.splice(index, 1)
    storage.saveData(data)
    return true
  },

  deleteTransactionsByCategory: (category: string): boolean => {
    const data = storage.getData()
    const filtered = data.transactions.filter((t) => t.category !== category)
    if (filtered.length === data.transactions.length) return false
    data.transactions = filtered
    storage.saveData(data)
    return true
  },

  getTransactions: (): Transaction[] => {
    return storage.getData().transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  },

  getTransactionsByDateRange: (startDate: string, endDate: string): Transaction[] => {
    const data = storage.getData()
    return data.transactions.filter((t) => t.date >= startDate && t.date <= endDate)
  },

  addCustomCategory: (category: Omit<Category, "id">): Category => {
    const data = storage.getData()
    const newCategory: Category = { ...category, id: `custom-${Date.now()}` }
    data.customCategories.unshift(newCategory)
    storage.saveData(data)
    return newCategory
  },

  deleteCustomCategory: (id: string): boolean => {
    const data = storage.getData()
    const index = data.customCategories.findIndex((c) => c.id === id)
    if (index === -1) return false
    data.customCategories.splice(index, 1)
    storage.saveData(data)
    return true
  },

  getAllCategories: (type: "expense" | "income"): Category[] => {
    const data = storage.getData()
    const builtIn = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
    return [...builtIn, ...data.customCategories.filter((c) => c.type === type)]
  },

  addCustomAccount: (account: Omit<Account, "id">): Account => {
    const data = storage.getData()
    const newAccount: Account = { ...account, id: `custom-${Date.now()}` }
    data.customAccounts.unshift(newAccount)
    storage.saveData(data)
    return newAccount
  },

  deleteCustomAccount: (id: string): boolean => {
    const data = storage.getData()
    const index = data.customAccounts.findIndex((c) => c.id === id)
    if (index === -1) return false
    data.customAccounts.splice(index, 1)
    storage.saveData(data)
    return true
  },

  deleteTransactionsByAccount: (account: string): boolean => {
    const data = storage.getData()
    const filtered = data.transactions.filter((t) => t.account !== account)
    if (filtered.length === data.transactions.length) return false
    data.transactions = filtered
    storage.saveData(data)
    return true
  },

  getAllAccounts: (): Account[] => {
    const data = storage.getData()
    const builtIn = ACCOUNTS
    return [...builtIn, ...data.customAccounts]
  },

  updateSettings: (settings: Partial<StorageData["settings"]>): void => {
    const data = storage.getData()
    data.settings = { ...data.settings, ...settings }
    storage.saveData(data)
  },

  getSettings: (): StorageData["settings"] => {
    return storage.getData().settings
  },

  clearAllData: (): void => {
    if (typeof window === "undefined") return
    localStorage.removeItem(STORAGE_KEY)
    notifyListeners() // ✅ Notify listeners that data was cleared
  },

  exportData: (): string => JSON.stringify(storage.getData(), null, 2),

  importData: (jsonData: string): boolean => {
    try {
      const data = JSON.parse(jsonData)
      if (data.transactions && Array.isArray(data.transactions)) {
        storage.saveData(data)
        return true
      }
      return false
    } catch (error) {
      console.error("Error importing data:", error)
      return false
    }
  },

  // ✅ Subscribe to storage changes
  onChange(listener: () => void) {
    listeners.push(listener)
    return () => {
      const index = listeners.indexOf(listener)
      if (index > -1) listeners.splice(index, 1)
    }
  },
}
