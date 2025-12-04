"use client"

import { useState, useCallback } from "react"
import { useTransactions } from "./use-transactions"
import { storage } from "@/lib/storage"
import { generatePDFReport } from "@/lib/pdf-generator"
import { useToast } from "@/hooks/use-toast"
import NepaliDate from "nepali-date-converter"
import { type Transaction, type Category, type Account } from "@/lib/types"
import { ask } from "@tauri-apps/plugin-dialog"

export function usePDFReport() {
  const [generating, setGenerating] = useState(false)
  const { toast } = useToast()
  const settings = storage.getSettings()

  // Month names
  const adMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const bsMonths = [
    "Baisakh", "Jestha", "Asar", "Shrawan", "Bhadra", "Ashwin",
    "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"
  ]

  const generateReport = useCallback(
    async (transactions: Transaction[], accounts: Account[], expenseCategories: Category[], incomeCategories: Category[], period: "monthly" | "annual", month?: number, year?: number, useBSDate?: boolean) => {
      const monthName = month ? useBSDate ? bsMonths[month] : adMonths[month] : ""

      try {
        const ok = await ask(
          `Do you want to generate financial report of ${period === "monthly" ? `${monthName}, ${year} ${useBSDate ? "BS" : "AD"}` : `${year} ${useBSDate ? "BS" : "AD"}`}?`
        )
        if (!ok) return

        setGenerating(true)

        let filtered = transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        
        // Date filtering based on selected calendar type
        filtered = filtered.filter((t) => {
          if (useBSDate) {
            const bs = new NepaliDate(new Date(t.date)).getBS()
            return bs.year === year
          } else {
            return new Date(t.date).getFullYear() === year
          }
        })

        if (period === "monthly") {
          filtered = filtered.filter((t) => {
            if (useBSDate) {
              const bs = new NepaliDate(new Date(t.date)).getBS()
              return bs.month === month
            } else {
              return new Date(t.date).getMonth() === month
            }
          })
        }

        if (!filtered || filtered.length === 0) {
          toast({
            title: "No data",
            description: "No transactions available to generate report",
            variant: "destructive",
          })
          setGenerating(false)
          return
        }
        
        generatePDFReport({
          transactions: filtered,
          period,
          month: period === "monthly" ? monthName : undefined,
          year: year || new Date().getFullYear(),
          calendar: useBSDate ? "BS" : "AD",
          currency: settings.currency,
          accounts,
          expenseCategories,
          incomeCategories
        })

        toast({
          title: `${period === "monthly" ? "Monthly" : "Annual"} report generated successfully`,
          description: `Saved to Documents/NepaliWallet`,
        })
      } catch (error) {
        console.error("Error generating report:", error)
        toast({
          title: "Error",
          description: "Failed to generate report",
          variant: "destructive",
        })
      } finally {
        setGenerating(false)
      }
    },
    [settings.currency, toast]
  )

  return {
    generateReport,
    generating,
  }
}
