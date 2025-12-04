"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/toaster"
import { useFirebaseSync } from "@/hooks/use-firebase-sync"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { AuthProvider } from "@/lib/auth-context"
import { storage } from "@/lib/storage"
import { Network } from "@capacitor/network"
import { useRouter } from "next/navigation"
import { App } from "@capacitor/app"
import { useSidebarStore } from "@/hooks/use-sidebar-store"
import { useEditFormStore } from "@/hooks/use-editform-store"
import { useTransactions } from "@/hooks/use-transactions"
import { useAccounts } from "@/hooks/use-accounts"
import NepaliDate from "nepali-date-converter"
import "./globals.css"

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  const { user, setupAuthListener } = useFirebaseAuth()
  const { syncData } = useFirebaseSync(user?.uid || null)

  // ⭐ Sidebar and Editform global store
  const { isOpen, close, open } = useSidebarStore()
  const { isFormOpen, closeForm } = useEditFormStore()

  // Month names
  const adMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const bsMonths = [
    "Baisakh", "Jestha", "Asar", "Shrawan", "Bhadra", "Ashwin",
    "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"
  ]

  // ⭐ BACK BUTTON HANDLER
  useEffect(() => {
    const listener = App.addListener("backButton", ({ canGoBack }) => {
      // 1️⃣ If sidebar is open, close it first
      if (isOpen || isFormOpen) {
        close()
        closeForm()
        return
      }

      // 2️⃣ Otherwise navigate back if possible
      if (canGoBack) {
        router.back()
      } else {
        // 3️⃣ Exit app when no history
        App.exitApp()
      }
    })

    return () => {
      listener.remove()
    }
  }, [isOpen, close, isFormOpen, closeForm, router])

  // ⭐ SWIPE GESTURE
  // useEffect(() => {
  //   let startX = 0

  //   document.addEventListener("touchstart", (e) => {
  //     startX = e.touches[0].clientX
  //   })

  //   document.addEventListener("touchend", (e) => {
  //     const endX = e.changedTouches[0].clientX
  //     const diff = endX - startX

  //     if (diff > 120) {   // threshold for swipe
  //       open()
  //     }
  //   })
  // }, [])

  // ⭐ Setup auth listener
  useEffect(() => {
    const unsubscribe = setupAuthListener()
    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [setupAuthListener])

  // ⭐ Auto-sync if online
  useEffect(() => {
    const unsubscribe = storage.onChange(async () => {
      const status = await Network.getStatus()

      if (storage.getData().settings.autoSync && status.connected) {
        syncData()
      }
    })

    return unsubscribe
  }, [syncData, user])

  // ⭐ Add carry-over if new month
  const { accounts } = useAccounts()
  const { transactions: trans, addTransaction } = useTransactions()
  const [carryOver, setCarryOver] = useState<"off" | "ad" | "bs">("off")

  useEffect(() => {
    const storedCarryOver = localStorage.getItem("carryOver")
    if (storedCarryOver !== null) {
      setCarryOver(storedCarryOver)
    }
  }, [])

  useEffect(() => {
    accounts.forEach((acc) => {
      const transactions = trans.filter((t) => t.account === acc.id)

      if (!transactions.length || carryOver === "off") return

      const latestTxn = transactions.sort((a, b) => b.date - a.date)[0]
      const today = new Date().toISOString().slice(0, 10)

      const newMonth = isNewMonth(latestTxn.date, today, carryOver)
      const prevMonth = carryOver === "ad" ? new Date(latestTxn.date).getMonth() : new NepaliDate(new Date(latestTxn.date)).getBS().month
      const currentMonth = carryOver === "ad" ? new Date().getMonth() : new NepaliDate(new Date()).getBS().month

      if (!newMonth) return
      if (carryOverExists(transactions, carryOver)) return

      const balance = getPreviousMonthBalance(transactions, carryOver)

      const addCarryOver = async () => {
        if (balance > 0) {
          await addTransaction({
            type: "income",
            amount: Math.abs(balance),
            account: acc.id,
            category: "carry-over",
            description: `Balance carried from ${carryOver === "ad" ? adMonths[prevMonth] : bsMonths[prevMonth]} to ${carryOver === "ad" ? adMonths[currentMonth] : bsMonths[currentMonth]}`,
            date: today,
          })
        }
      }

      addCarryOver()
    })
  }, [trans, carryOver, accounts])

  function getMonthKey(dateStr: string, calendarType: "ad" | "bs") {
    if (calendarType === "ad") {
      const d = new Date(dateStr)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    } else {
      const bs = new NepaliDate(new Date(dateStr)).getBS()
      return `${bs.year}-${String(bs.month).padStart(2, "0")}`
    }
  }

  function carryOverExists(
    transactions,
    calendarType: "ad" | "bs"
  ) {
    const now = new Date()
    const monthKey =
      calendarType === "ad"
        ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
        : (() => {
            const bs = new NepaliDate(now).getBS()
            return `${bs.year}-${String(bs.month).padStart(2, "0")}`
          })()

    return transactions.some(
      (t) =>
        t.type === "income" &&
        t.category === "carry-over" &&
        getMonthKey(t.date, calendarType) === monthKey
    )
  }

  function getPreviousMonthBalance(
    transactions,
    calendarType: "ad" | "bs"
  ) {
    let prevYear, prevMonth

    if (calendarType === "ad") {
      const now = new Date()
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      prevYear = prev.getFullYear()
      prevMonth = prev.getMonth() + 1
    } else {
      const bs = new NepaliDate(new Date()).getBS()
      prevYear = bs.month === 1 ? bs.year - 1 : bs.year
      prevMonth = bs.month === 1 ? 12 : bs.month - 1
    }

    let balance = 0

    transactions.forEach((t) => {
      const key = getMonthKey(t.date, calendarType)
      const matchKey = `${prevYear}-${String(prevMonth).padStart(2, "0")}`

      if (key === matchKey) {
        if (t.type === "income") balance += t.amount
        else balance -= t.amount
      }
    })

    return balance
  }

  function isNewMonth(
    lastDate: string,
    currentDate: string,
    calendarType: "ad" | "bs"
  ) {
    return (
      getMonthKey(lastDate, calendarType) !==
      getMonthKey(currentDate, calendarType)
    )
  }

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased">
        <AuthProvider>
          {children}
          <Toaster />
          <Analytics />
        </AuthProvider>
      </body>
    </html>
  )
}
