"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { usePDFReport } from "@/hooks/use-pdf-report"
import { FileText, Download } from 'lucide-react'
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import NepaliDate from "nepali-date-converter"
import { type Transaction } from "@/lib/types"
import { useCategories } from "@/hooks/use-categories"
import { useAccounts } from "@/hooks/use-accounts"

export function ReportGenerator({ transactions }: { transactions: Transaction[] }) {
  const [reportType, setReportType] = useState<"monthly" | "annual">("monthly")
  const { generateReport, generating } = usePDFReport()
  const { expenseCategories, incomeCategories } = useCategories()
  const { accounts } = useAccounts()

  // Get today's date
  const today = new Date()
  const todayADYear = today.getFullYear()
  const todayADMonth = today.getMonth() // 0-based index
  const todayBS = new NepaliDate(today).getBS()
  const todayBSYear = todayBS.year
  const todayBSMonth = todayBS.month
  
  const [useBSDate, setUseBSDate] = useState(false) // Toggle between AD/BS
  useEffect(() => {
    const stored = localStorage.getItem("useBSDateReport")
    if (stored !== null) {
      setUseBSDate(JSON.parse(stored))
    }
  }, [])

  const [selectedYear, setSelectedYear] = useState(todayADYear.toString())
  const [selectedMonth, setSelectedMonth] = useState(todayADMonth.toString())

  // Month names
  const adMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const bsMonths = [
    "Baisakh", "Jestha", "Asar", "Shrawan", "Bhadra", "Ashwin",
    "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"
  ]

  // Year options based on calendar type
  const yearOptions = useBSDate ? [2080, 2081, 2082, 2083, 2084, 2085, 2086, 2087] : [2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030]
  const monthOptions = useBSDate ? bsMonths : adMonths

  // Reset date filters when switching calendar type
  useEffect(() => {
    if (useBSDate) {
      setSelectedYear(todayBSYear.toString())
      setSelectedMonth(todayBSMonth.toString())
    } else {
      setSelectedYear(todayADYear.toString())
      setSelectedMonth(todayADMonth.toString())
    }
  }, [useBSDate])

  const handleGenerateReport = () => {
    if (reportType === "monthly") {
      generateReport(transactions, accounts, expenseCategories, incomeCategories, "monthly", parseInt(selectedMonth), parseInt(selectedYear), useBSDate)
    } else {
      generateReport(transactions, accounts, expenseCategories, incomeCategories, "annual", undefined, parseInt(selectedYear), useBSDate)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Generate Financial Report
        </CardTitle>
        <CardDescription>Create and download PDF reports of your finances</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Report Type Selection */}
        <div className="flex gap-2 items-center">
          <label className="text-sm font-medium">Report Type</label>
          <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
            <SelectTrigger className="w-[175px] bg-background border-border shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly Report</SelectItem>
              <SelectItem value="annual">Annual Report</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 -mt-2 max-sm:flex-col">
          <div className="flex items-center gap-2">
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
                onCheckedChange={(checked) => {setUseBSDate(checked); localStorage.setItem("useBSDateReport", JSON.stringify(checked))}}
              />
              <Label htmlFor="calendar-toggle" className="text-sm whitespace-nowrap cursor-pointer">
                BS
              </Label>
            </div>
          </div>
          <div className="flex gap-2">
            {/* Year Selection */}
            <div className="flex gap-2 items-center">
              <label className="text-sm font-medium">Year</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[90px] bg-background border-border shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Month Selection (only for monthly reports) */}
            {reportType === "monthly" && (
              <div className="flex gap-2 items-center">
                <label className="text-sm font-medium">Month</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[115px] bg-background border-border shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((month, index) => (
                      <SelectItem key={month} value={String(index)}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerateReport}
          disabled={generating}
          className="w-full gap-2"
        >
          <Download className="h-4 w-4" />
          {generating ? "Generating Report..." : "Download PDF Report"}
        </Button>
      </CardContent>
    </Card>
  )
}
