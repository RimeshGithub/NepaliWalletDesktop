"use client"

import { useState, useEffect } from "react"
import { useTransactions } from "@/hooks/use-transactions"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { type Transaction } from "@/lib/types"
import { useCategories } from "@/hooks/use-categories"
import { useAccounts } from "@/hooks/use-accounts"
import { Plus, Trash2, Download, SortAsc, SortDesc, TrendingUp, Sheet, List, MoreHorizontal, Edit } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import NepaliDate from "nepali-date-converter"
import { getCurrency } from "@/hooks/use-currency"
import { useToast } from "@/hooks/use-toast"
import { ACCOUNTS } from "@/lib/types"
import { format, set } from "date-fns"
import { EditTransactionForm } from "@/components/edit-transaction-form"
import { useEditFormStore } from "@/hooks/use-editform-store"
import { create, mkdir, BaseDirectory } from "@tauri-apps/plugin-fs"
import { ask } from "@tauri-apps/plugin-dialog"

export function AccountsList() {
  const { transactions: trans, deleteTransaction } = useTransactions()
  const [transactions, setTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    setTransactions(trans)
  }, [trans])

  const { toast } = useToast()
  const { expenseCategories, incomeCategories, getCustomCategories } = useCategories()
  const { accounts, deleteAccount, deleteTransactionsByAccount } = useAccounts()
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])

  const [filterAccount, setFilterAccount] = useState("cash")
  const [isExporting, setIsExporting] = useState(false)

  // Get today's date
  const today = new Date()
  const todayADYear = today.getFullYear()
  const todayADMonth = today.getMonth() // 0-based index
  const todayBS = new NepaliDate(today).getBS()
  const todayBSYear = todayBS.year
  const todayBSMonth = todayBS.month

  // Date filter state
  const [useBSDate, setUseBSDate] = useState(false) // Toggle between AD/BS

  useEffect(() => {
    const stored = localStorage.getItem("useBSDateAccounts")
    if (stored !== null) {
      setUseBSDate(JSON.parse(stored))
    }

    const storedFilterAccount = localStorage.getItem("filterAccountAccounts")
    if (storedFilterAccount !== null) {
      setFilterAccount(storedFilterAccount)
    }

    const storedViewModeList = localStorage.getItem("viewModeListAccounts")
    if (storedViewModeList !== null) {
      setViewModeList(JSON.parse(storedViewModeList))
    }
  }, [])

  const [filterYear, setFilterYear] = useState(todayADYear.toString())
  const [filterMonth, setFilterMonth] = useState(todayADMonth.toString())
  const [filteredYearMonths, setFilteredYearMonths] = useState<Transaction[]>([])

  const { isFormOpen, openForm, closeForm } = useEditFormStore()
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [sortAsc, setSortAsc] = useState(false)
  const [viewModeList, setViewModeList] = useState(true)

  // Month names
  const adMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const bsMonths = [
    "Baisakh", "Jestha", "Asar", "Shrawan", "Bhadra", "Ashwin",
    "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"
  ]

  // Year options based on calendar type
  const yearOptions = useBSDate ? [2080, 2081, 2082, 2083, 2084, 2085, 2086, 2087] : [2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030]
  const monthOptions = useBSDate ? bsMonths : adMonths

  const incomeDisp = filteredTransactions.filter((t) => t.type === "income").reduce((acc, t) => acc + t.amount, 0)
  const expenseDisp = filteredTransactions.filter((t) => t.type === "expense").reduce((acc, t) => acc + t.amount, 0)

  // Filtering logic
  useEffect(() => {
    let filtered = [...transactions].sort((a, b) => {
      const dateDiff = sortAsc
        ? new Date(a.date).getTime() - new Date(b.date).getTime()
        : new Date(b.date).getTime() - new Date(a.date).getTime()

      // If dates are the same, sort by createdAt
      if (dateDiff === 0) {
        return sortAsc
          ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }

      return dateDiff
    })

    // Date filtering based on selected calendar type
    if (filterYear !== "all") {
      filtered = filtered.filter((t) => {
        if (useBSDate) {
          const bs = new NepaliDate(new Date(t.date)).getBS()
          return bs.year.toString() === filterYear
        } else {
          return new Date(t.date).getFullYear().toString() === filterYear
        }
      })
    }

    if (filterMonth !== "all") {
      filtered = filtered.filter((t) => {
        if (useBSDate) {
          const bs = new NepaliDate(new Date(t.date)).getBS()
          return bs.month.toString() === filterMonth
        } else {
          return new Date(t.date).getMonth().toString() === filterMonth
        }
      })
    }

    // Account
    if (filterAccount !== "all") {
      filtered = filtered.filter((t) => t.account === filterAccount)
    }

    setFilteredTransactions(filtered)

    setFilteredYearMonths(
      [...filtered].sort((a, b) => {
        const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime()
        if (dateDiff !== 0) return dateDiff

        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      })
    )
  }, [
    transactions,
    filterAccount,
    filterYear,
    filterMonth,
    useBSDate,
    sortAsc
  ])

  // Reset date filters when switching calendar type
  useEffect(() => {
    if (useBSDate) {
      setFilterYear(todayBSYear.toString())
      setFilterMonth(todayBSMonth.toString())
    } else {
      setFilterYear(todayADYear.toString())
      setFilterMonth(todayADMonth.toString())
    }
  }, [useBSDate])

  useEffect(() => {
    if (!isFormOpen) {
      setEditingTransaction(null)
    }
  }, [isFormOpen])

  const handleDeleteAccount = async (accId: string, accName: string) => {
    const confirm = await ask(`Are you sure you want to delete "${accName}" account and its associated transactions?`)
    if (!confirm) return

    try {
      deleteAccount(accId)
      deleteTransactionsByAccount(accId)
      setFilterAccount("cash")
      setTransactions(transactions.filter((t) => t.account !== accId))
      toast({
        title: "Account Deleted",
        description: `${accName} has been removed.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete account. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteTransaction(id)
    } catch (e) {
      console.error("Delete failed:", e)
    }
  }

  const isTauri = () =>
    typeof window !== "undefined" && "__TAURI_INTERNALS__" in window

  const handleExportData = async (format: "csv" | "txt") => {
    if (!filteredYearMonths.length) {
      toast({
        title: "No Data",
        description: "You don't have any transactions to export.",
        variant: "destructive",
      })
      return
    }

    const filterCondition =
      filterYear === "all" && filterMonth === "all"
        ? "All"
        : filterYear === "all"
        ? "Year"
        : filterMonth === "all"
        ? "Month"
        : "Date"

    const ok = await ask(
      `Do you want to export ${
        filterCondition === "All"
          ? "all of your transactions"
          : "your transactions of "
      }${
        filterCondition === "Date"
          ? `${monthOptions[parseInt(filterMonth)]}, ${filterYear} ${
              useBSDate ? "BS" : "AD"
            }`
          : filterCondition === "Year"
          ? `${monthOptions[parseInt(filterMonth)]}`
          : filterCondition === "Month"
          ? `${filterYear} ${useBSDate ? "BS" : "AD"}`
          : ""
      } of ${getAccountName(filterAccount)} account in ${
        format === "csv" ? "CSV" : "TXT"
      } format?`
    )

    if (!ok) return

    setIsExporting(true)

    try {
      let content = ""
      let filename = ""

      const d = new Date()

      let stamp =
        filterCondition === "Date"
          ? `${monthOptions[parseInt(filterMonth)]}-${filterYear}${
              useBSDate ? "BS" : "AD"
            }-`
          : filterCondition === "Year"
          ? `${monthOptions[parseInt(filterMonth)]}-`
          : filterCondition === "Month"
          ? `${filterYear}${useBSDate ? "BS" : "AD"}-`
          : ""

      stamp += `${getAccountName(filterAccount)}-exported-${d.getFullYear()}-${(
        d.getMonth() + 1
      )
        .toString()
        .padStart(2, "0")}-${d
        .getDate()
        .toString()
        .padStart(2, "0")}_${d
        .getHours()
        .toString()
        .padStart(2, "0")}-${d
        .getMinutes()
        .toString()
        .padStart(2, "0")}-${d
        .getSeconds()
        .toString()
        .padStart(2, "0")}`

      if (format === "csv") {
        const headers = [
          "Date",
          "Type",
          "Category",
          "Description",
          "Income",
          "Expense",
          "Balance",
        ]

        let runningBalance = 0
        let totalIncome = 0
        let totalExpense = 0

        const csvContent = [
          headers.join(","),

          ...filteredYearMonths
            .sort(
              (a, b) =>
                new Date(a.date).getTime() - new Date(b.date).getTime()
            )
            .map((t) => {
              const isIncome = t.type.toLowerCase() === "income"
              const income = isIncome ? t.amount : ""
              const expense = !isIncome ? t.amount : ""

              runningBalance += isIncome ? t.amount : -t.amount
              totalIncome += isIncome ? t.amount : 0
              totalExpense += !isIncome ? t.amount : 0

              return [
                customDateFormat(t.date),
                t.type,
                getCategoryName(t.category),
                `"${t.description.replace(/"/g, '""')}"`,
                income,
                expense,
                runningBalance,
              ].join(",")
            }),

          ["", "", "", "Total", totalIncome, totalExpense, runningBalance].join(
            ","
          ),
        ].join("\n")

        content = csvContent
        filename = `nepali-wallet-${stamp}.csv`
      } else {
        const filtered = filteredYearMonths
          .sort(
            (a, b) =>
              new Date(a.date).getTime() - new Date(b.date).getTime()
          )
          .map((t) => ({
            date: customDateFormat(t.date),
            type: t.type,
            category: getCategoryName(t.category),
            amount: t.amount,
            description: t.description,
          }))

        content = JSON.stringify(filtered, null, 2)
        filename = `nepali-wallet-${stamp}.txt`
      }

      // ---------------------------------------------------------
      // ✅ TAURI DESKTOP AUTO-SAVE TO Documents/NepaliWallet
      // ---------------------------------------------------------
      if (isTauri()) {
        try {
          // ✅ Ensure folder exists
          await mkdir("NepaliWallet", {
            baseDir: BaseDirectory.Document,
            recursive: true,
          })

          const file = await create(`NepaliWallet/${filename}`, {
            baseDir: BaseDirectory.Document,
          })

          await file.write(new TextEncoder().encode(content))
          await file.close()

          toast({
            title: "Export Successful",
            description: `Saved to Documents/NepaliWallet`,
          })

          return // ✅ VERY IMPORTANT: stop here (no web fallback)
        } catch (error: any) {
          console.error("Tauri export error:", error)

          toast({
            title: "Export Failed",
            description:
              error?.message || "Failed to save file.",
            variant: "destructive",
          })

          return
        }
      }

      // ---------------------------------------------------------
      // ✅ WEB FALLBACK (Browser only)
      // ---------------------------------------------------------
      const blob = new Blob([content], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)

      toast({
        title: "Export Successful",
        description: `Your data has been exported as ${format.toUpperCase()}.`,
      })
    } catch (error: any) {
      console.error(error)
      toast({
        title: "Export Failed",
        description: error?.message || "Failed to export data.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const customDateFormat = (date: string) => {
    const d = new Date(date)
    if(useBSDate) {
      const nepaliDate = new NepaliDate(new Date(date))
      return `${nepaliDate.getYear()}-${(nepaliDate.getMonth() + 1).toString().padStart(2,"0")}-${nepaliDate.getDate().toString().padStart(2,"0")}`
    }
    return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,"0")}-${d.getDate().toString().padStart(2,"0")}`
  }

  const getCategoryInfo = (categoryId: string, type: "expense" | "income") => {
    const categories = type === "expense" ? expenseCategories : incomeCategories
    return categories.find((c) => c.id === categoryId) || { name: categoryId, icon: "📦", color: "bg-gray-500" }
  }

  const getCategoryName = (catId: string) => {
    const category = [...expenseCategories, ...incomeCategories].find((c) => c.id === catId)
    return category ? category.name : catId
  }

  const getAccountName = (accId: string) => {
    const account = accounts.find((a) => a.id === accId)
    return account ? account.name : accId
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between max-sm:flex-col max-sm:gap-2 max-sm:items-start">
        <div>
          <h1 className="text-3xl font-bold">Accounts</h1>
          <p className="text-muted-foreground">Track your accounts.</p>
        </div>
        <Button asChild className="max-sm:ml-auto">
          <Link href="/dashboard/settings#accountManager">
            <Plus className="mr-2 h-4 w-4" /> Add Account
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card className="shadow-sm border">
        <CardContent className="px-4">
          <div className="flex gap-5 justify-center items-center">
            {/* Account Filter */}
            <div className={`flex items-center gap-2 max-sm:gap-1`}>
              <Label htmlFor="account-filter" className="text-sm font-medium whitespace-nowrap">
                Account
              </Label>
              <Select value={filterAccount} onValueChange={(val) => {setFilterAccount(val); localStorage.setItem("filterAccountAccounts", val)}}>
                <SelectTrigger id="account-filter" className="w-[170px] bg-background border-border shadow-none">
                  <SelectValue placeholder="Account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => { 
                    return (
                      <SelectItem key={acc.id} value={acc.id}>
                        <div className="flex items-center gap-2">
                          <span className="w-5 text-center font-bold overflow-hidden">{acc.icon}</span>
                          <span>{acc.name}</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDeleteAccount(filterAccount, getAccountName(filterAccount))}
              className="hover:bg-red-500"
              disabled={ACCOUNTS.map((acc) => acc.id).includes(filterAccount)}
            >
              <Trash2 className="h-4 w-4 hover:text-white" />
            </Button>
          </div> 
          
          {/* Date Filter Section */}
          <div className={`mt-4 flex gap-5 bg-muted/30 p-3 rounded-lg border items-center justify-center max-xl:flex-col max-xl:gap-3 max-xl:items-center`}>
            <div className="flex max-md:flex-col justify-center items-center gap-3">
              {/* Calendar Toggle */}
              <div className="flex items-center gap-2 max-sm:gap-1">
                <Label className="text-sm font-medium whitespace-nowrap">
                  Calendar
                </Label>
                <div className="flex items-center space-x-2 bg-background px-3 py-2 rounded-md border">
                  <Label htmlFor="calendar-toggle" className="text-sm whitespace-nowrap cursor-pointer">
                    AD
                  </Label>
                  <Switch
                    id="calendar-toggle"
                    checked={useBSDate}
                    onCheckedChange={(checked) => {setUseBSDate(checked); localStorage.setItem('useBSDateAccounts', checked.toString())}}
                  />
                  <Label htmlFor="calendar-toggle" className="text-sm whitespace-nowrap cursor-pointer">
                    BS
                  </Label>
                </div>
              </div>
              
              {/* Date Filters */}
              <div className="flex gap-3 max-md:justify-between">
                {/* Year Filter */}
                <div className="flex items-center gap-2 max-sm:gap-1">
                  <Label htmlFor="year-filter" className="text-sm font-medium whitespace-nowrap">
                    Year
                  </Label>
                  <Select value={filterYear} onValueChange={setFilterYear}>
                    <SelectTrigger id="year-filter" className="w-[90px] bg-background border-border shadow-none">
                      <SelectValue placeholder={`${useBSDate ? 'BS' : 'AD'} Year`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {yearOptions.map((y) => (
                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Month Filter */}
                <div className="flex items-center gap-2 max-sm:gap-1">
                  <Label htmlFor="month-filter" className="text-sm font-medium whitespace-nowrap">
                    Month
                  </Label>
                  <Select value={filterMonth} onValueChange={setFilterMonth}>
                    <SelectTrigger id="month-filter" className="w-[115px] bg-background border-border shadow-none">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {monthOptions.map((m, i) => (
                        <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleExportData("csv")} disabled={isExporting}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExportData("txt")} disabled={isExporting}>
                <Download className="h-4 w-4 mr-2" />
                Export TXT
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Overview */}
      <div className="space-y-4 max-md:text-sm cursor-default">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
              {/* Title Section */}
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl shadow-md">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">Financial Overview</h3>
                  <p className="text-sm text-gray-600">Selected period & account analysis</p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full lg:w-auto">
                {/* Income */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-3 text-center hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 shadow-sm"></div>
                    <span className="font-semibold text-green-700 text-sm">Income</span>
                  </div>
                  <div className="text-md font-bold text-green-900">{getCurrency()} {incomeDisp.toLocaleString("en-IN", {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                </div>

                {/* Expense */}
                <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-3 text-center hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-red-400 to-pink-500 shadow-sm"></div>
                    <span className="font-semibold text-red-700 text-sm">Expense</span>
                  </div>
                  <div className="text-md font-bold text-red-900">{getCurrency()} {expenseDisp.toLocaleString("en-IN", {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                </div>

                {/* Balance */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 text-center hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 shadow-sm"></div>
                    <span className="font-semibold text-amber-700 text-sm">Balance</span>
                  </div>
                  <div className={`text-md font-bold ${(incomeDisp - expenseDisp) >= 0 ? 'text-amber-900' : 'text-red-900'}`}>
                    {getCurrency()} {(incomeDisp - expenseDisp).toLocaleString("en-IN", {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </div>
                </div>

                {/* Transactions Count */}
                <div className="bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-xl p-3 text-center hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-gray-400 to-slate-500 shadow-sm"></div>
                    <span className="font-semibold text-gray-700 text-sm">Transactions</span>
                  </div>
                  <div className="text-md font-bold text-gray-900">{filteredTransactions.length}</div>
                </div>
              </div>
            </div>

            {/* Progress Bar for Balance (only shown when viewing all) */}
            {(incomeDisp > 0) && (
              <div className="mt-4 pt-4 border-t border-gray-200/60">
                {/* Header */}
                <div className="flex justify-between text-xs text-gray-700 mb-2 font-medium">
                  <span className="flex-1 font-bold">Income vs Expense</span>
                  <span className="flex-2 text-right">
                    {expenseDisp > incomeDisp
                      ? "Over-budget!"
                      : `${((expenseDisp / incomeDisp) * 100).toFixed(1)}% of income spent`}
                  </span>
                </div>

                {/* Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden relative">
                  {/* Base (income axis) */}
                  <div className="absolute inset-0 bg-gradient-to-r from-green-300 to-green-500" />

                  {/* Expense indicator */}
                  <div
                    className={`absolute inset-y-0 left-0 h-2 rounded-full bg-gradient-to-r ${
                      expenseDisp > incomeDisp
                        ? "from-red-500 to-red-600"
                        : "from-amber-500 to-red-500"
                    } transition-all duration-500`}
                    style={{
                      width: `${Math.min(100, (expenseDisp / (incomeDisp + expenseDisp)) * 100)}%`
                    }}
                  />
                </div>

                {/* Footer stats */}
                <div className="mt-2 flex justify-between text-xs text-gray-600">
                  <span>Expense: {getCurrency()} {expenseDisp.toLocaleString("en-IN", {minimumFractionDigits: 2, maximumFractionDigits: 2})} ({Math.min(100, (expenseDisp / (incomeDisp + expenseDisp)) * 100).toFixed(1)}%)</span>
                  <span className="text-right">Income: {getCurrency()} {incomeDisp.toLocaleString("en-IN", {minimumFractionDigits: 2, maximumFractionDigits: 2})} ({(100 - Math.min(100, (expenseDisp / (incomeDisp + expenseDisp)) * 100)).toFixed(1)}%)</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transactions */}
      <div className={`flex items-center gap-4 px-3`}>
        <h1 className="text-2xl font-bold">Transactions</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSortAsc(!sortAsc)}>
            {sortAsc ? <SortDesc className="h-4 w-4" /> : <SortAsc className="h-4 w-4" />}
          </Button>
          <Button variant="outline" onClick={() => {localStorage.setItem("viewModeListAccounts", String(!viewModeList)); setViewModeList(!viewModeList)}}>
            {viewModeList ? <Sheet className="h-4 w-4" /> : <List className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <div className="space-y-4">
        {filteredTransactions.length === 0 ? (
          <Card><CardContent className="p-12 text-center">No transactions found</CardContent></Card>
        ) : (
          viewModeList ?
          (
            filteredTransactions.map((t) => {
              const cat = getCategoryInfo(t.category, t.type)
              const bs = new NepaliDate(new Date(t.date)).getBS()
              return (
                <Card key={t.id}>
                  <CardContent className="p-6 py-0 flex justify-between items-center max-sm:flex-col max-sm:gap-3.5">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full ${cat.color} flex items-center justify-center text-black font-bold text-2xl`}>
                          {cat.icon}
                        </div>
                        <div>
                          <Badge variant={t.type === "income" ? "default" : "destructive"}>{cat.name}</Badge>
                          <div className="text-xs mt-1 text-muted-foreground">
                            {format(new Date(t.date), "MMM dd, yyyy")} AD | {bsMonths[bs.month]} {bs.date}, {bs.year} BS
                          </div>
                        </div>
                      </div>
                      {t.description && <p className="text-sm mt-2 px-3">{t.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`font-bold ${t.type === "income" ? "text-green-600" : "text-red-600"}`}>
                        {t.type === "income" ? "+ " : "- "}{getCurrency()} {t.amount.toLocaleString("en-IN", {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {setEditingTransaction(t); openForm()}}>
                            <Edit className="mr-2 h-4 w-4 hover:text-white" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(t.id)} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4 hover:text-white" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          ) : (
            <div className="overflow-x-auto mb-20">
              <table className="w-full text-sm border-collapse">
                {/* ===== TABLE HEADER ===== */}
                <thead className="bg-muted">
                  <tr className="text-left">
                    <th className="border border-gray-300 px-4 py-3 font-semibold min-w-30">Date ({useBSDate ? "BS" : "AD"})</th>
                    <th className="border border-gray-300 px-4 py-3 font-semibold min-w-35">Category</th>
                    <th className="border border-gray-300 px-4 py-3 font-semibold min-w-35">Income ({getCurrency()})</th>
                    <th className="border border-gray-300 px-4 py-3 font-semibold min-w-35">Expense ({getCurrency()})</th>
                    <th className="border border-gray-300 px-4 py-3 font-semibold min-w-35">Balance ({getCurrency()})</th>
                    <th className="border border-gray-300 px-4 py-3 font-semibold max-xl:min-w-100">Description</th>
                  </tr>
                </thead>
  
                {/* ===== TABLE BODY ===== */}
                <tbody>
                  {(() => {
                    let runningBalance = 0
  
                    return filteredTransactions.map((t, idx) => {
                      const isIncome = t.type === "income"
                      const income = isIncome ? t.amount : ""
                      const expense = !isIncome ? t.amount : ""
  
                      // update running balance
                      runningBalance += isIncome ? t.amount : -t.amount
  
                      const bsDate = new NepaliDate(new Date(t.date)).getBS()
  
                      return (
                        <tr
                          key={t.id}
                          className={idx % 2 === 0 ? "bg-background" : "bg-muted/40"}
                        >
                          {/* Date */}
                          <td className="border border-gray-300 px-4 py-2">
                            {customDateFormat(t.date)}
                          </td>

                          {/* Category */}
                          <td className="border border-gray-300 px-4 py-2">
                            {getCategoryName(t.category)}
                          </td>
  
                          {/* Income */}
                          <td className="border border-gray-300 px-4 py-2 text-green-600 font-semibold">
                            {income
                              ? `+ ${t.amount.toLocaleString("en-IN", {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
                              : ""}
                          </td>
  
                          {/* Expense */}
                          <td className="border border-gray-300 px-4 py-2 text-red-600 font-semibold">
                            {expense
                              ? `- ${t.amount.toLocaleString("en-IN", {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
                              : ""}
                          </td>
  
                          {/* Balance */}
                          <td className="border border-gray-300 px-4 py-2 font-semibold">
                            {runningBalance >= 0
                              ? `+ ${runningBalance.toLocaleString("en-IN", {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
                              : `- ${Math.abs(runningBalance).toLocaleString("en-IN", {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
                          </td>
  
                          {/* Description */}
                          <td className="border border-gray-300 px-4 py-2">
                            {t.description}
                          </td>
                        </tr>
                      )
                    })
                  })()}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingTransaction} onOpenChange={() => {setEditingTransaction(null); closeForm()}}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription>Update your transaction details</DialogDescription>
          </DialogHeader>
          {editingTransaction && (
            <EditTransactionForm
              transaction={editingTransaction}
              onComplete={(transaction) => {setTransactions((prev) => prev.map((t) => t.id === transaction.id ? transaction : t)); setEditingTransaction(null)}}
              onCancel={() => setEditingTransaction(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}