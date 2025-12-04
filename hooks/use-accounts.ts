"use client"

import { useState, useEffect, useCallback } from "react"
import { storage } from "@/lib/storage"
import type { Account } from "@/lib/types"

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

  // Load categories on mount
  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = useCallback(() => {
    setLoading(true)
    try {
      const accounts = storage.getAllAccounts()
      setAccounts(accounts)
    } finally {
      setLoading(false)
    }
  }, [])

  const addAccount = useCallback(
    (name: string, icon: string) => {
      try {
        const newAccount = storage.addCustomAccount({
          name,
          icon,
        })
        loadAccounts()
        return newAccount
      } catch (error) {
        console.error("Error adding account:", error)
        throw error
      }
    },
    [loadAccounts],
  )

  const deleteAccount = useCallback(
    (id: string) => {
      try {
        const success = storage.deleteCustomAccount(id)
        if (success) {
          localStorage.removeItem("filterAccountAccounts")
          localStorage.removeItem("filterAccountDashboard")
          localStorage.removeItem("filterAccountTransactionsList")
          loadAccounts()
        }
        return success
      } catch (error) {
        console.error("Error deleting account:", error)
        throw error
      }
    },
    [loadAccounts],
  )

  const deleteTransactionsByAccount = useCallback(
    (id: string) => {
      try {
        const success = storage.deleteTransactionsByAccount(id)
        if (success) {
          loadAccounts()
        }
        return success
      } catch (error) {
        console.error("Error deleting account transactions:", error)
        throw error
      }
    },
    [loadAccounts],
  )

  const getCustomAccounts = useCallback(() => {
    const data = storage.getData()
    return data.customAccounts
  }, [])

  return {
    accounts,
    loading,
    addAccount,
    deleteAccount,
    deleteTransactionsByAccount,
    getCustomAccounts,
    loadAccounts,
  }
}
