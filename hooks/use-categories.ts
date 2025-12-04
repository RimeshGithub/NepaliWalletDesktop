"use client"

import { useState, useEffect, useCallback } from "react"
import { storage } from "@/lib/storage"
import type { Category } from "@/lib/types"

export function useCategories() {
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([])
  const [incomeCategories, setIncomeCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  // Load categories on mount
  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = useCallback(() => {
    setLoading(true)
    try {
      const expenses = storage.getAllCategories("expense")
      const incomes = storage.getAllCategories("income")
      setExpenseCategories(expenses)
      setIncomeCategories(incomes)
    } finally {
      setLoading(false)
    }
  }, [])

  const addCategory = useCallback(
    (name: string, icon: string, color: string, type: "expense" | "income") => {
      try {
        const newCategory = storage.addCustomCategory({
          name,
          icon,
          color,
          type,
        })
        loadCategories()
        return newCategory
      } catch (error) {
        console.error("Error adding category:", error)
        throw error
      }
    },
    [loadCategories],
  )

  const deleteCategory = useCallback(
    (id: string) => {
      try {
        const success = storage.deleteCustomCategory(id)
        if (success) {
          loadCategories()
        }
        return success
      } catch (error) {
        console.error("Error deleting category:", error)
        throw error
      }
    },
    [loadCategories],
  )

  const deleteTransactionsByCategory = useCallback(
    (id: string) => {
      try {
        const success = storage.deleteTransactionsByCategory(id)
        if (success) {
          loadCategories()
        }
        return success
      } catch (error) {
        console.error("Error deleting category transactions:", error)
        throw error
      }
    },
    [loadCategories],
  )

  const getCustomCategories = useCallback((type: "expense" | "income") => {
    const data = storage.getData()
    return data.customCategories.filter((c) => c.type === type)
  }, [])

  return {
    expenseCategories,
    incomeCategories,
    loading,
    addCategory,
    deleteCategory,
    deleteTransactionsByCategory,
    getCustomCategories,
    loadCategories,
  }
}
