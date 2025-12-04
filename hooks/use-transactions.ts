"use client"

import { useState, useEffect, useCallback } from "react"
import { storage } from "@/lib/storage"
import type { Transaction } from "@/lib/types"

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load transactions from local storage on mount
  useEffect(() => {
    try {
      const data = storage.getTransactions()
      setTransactions(data)
      setError(null)
    } catch (err) {
      console.error("Error loading transactions:", err)
      setError("Failed to load transactions")
    } finally {
      setLoading(false)
    }
  }, [])

  // Add new transaction
  const addTransaction = useCallback(
    async (transaction: Omit<Transaction, "id" | "userId" | "createdAt" | "updatedAt">) => {
      try {
        const newTransaction = storage.addTransaction(transaction)
        setTransactions((prev) => [newTransaction, ...prev])
        setError(null)
        return newTransaction
      } catch (err) {
        console.error("Error adding transaction:", err)
        const errorMessage = "Failed to add transaction"
        setError(errorMessage)
        throw new Error(errorMessage)
      }
    },
    [],
  )

  // Update existing transaction
  const updateTransaction = useCallback(async (transactionId: string, updates: Partial<Transaction>) => {
    try {
      const updated = storage.updateTransaction(transactionId, updates)
      if (updated) {
        setTransactions((prev) => prev.map((t) => (t.id === transactionId ? updated : t)))
        setError(null)
      }
    } catch (err) {
      console.error("Error updating transaction:", err)
      const errorMessage = "Failed to update transaction"
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [])

  // Delete transaction by ID
  const deleteTransaction = useCallback(async (transactionId: string) => {
    try {
      const success = storage.deleteTransaction(transactionId)
      if (success) {
        setTransactions((prev) => prev.filter((t) => t.id !== transactionId))
        setError(null)
      }
    } catch (err) {
      console.error("Error deleting transaction:", err)
      const errorMessage = "Failed to delete transaction"
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [])

  // Delete all transactions by category
  const deleteTransactionsByCategory = useCallback(async (categoryId: string) => {
    try {
      const toDelete = transactions.filter((t) => t.category === categoryId)
      for (const tx of toDelete) {
        storage.deleteTransaction(tx.id)
      }
      setTransactions((prev) => prev.filter((t) => t.category !== categoryId))
      setError(null)
    } catch (err) {
      console.error("Error deleting transactions by category:", err)
      const errorMessage = "Failed to delete transactions by category"
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [transactions])

  return {
    transactions,
    loading,
    error,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    deleteTransactionsByCategory,
  }
}
