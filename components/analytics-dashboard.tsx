"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ExpenseIncomeChart } from "./expense-income-chart"
import { CategoryChart } from "./category-chart"
import { TrendChart } from "./trend-chart"
import { IncomeVsExpenseChart } from "./income-vs-expense-chart"
import { useTransactions } from "@/hooks/use-transactions"
import { TrendingUp, TrendingDown, Wallet, PieChart } from "lucide-react"
import NepaliDate from "nepali-date-converter"
import { useCategories } from "@/hooks/use-categories"
import { getCurrency } from "@/hooks/use-currency"

// helper: get start date for selected time range
function getStartDate(timeRange: string) {
  const now = new Date()
  if (timeRange === "3months") {
    return new Date(now.getFullYear(), now.getMonth() - 2, 1)
  }
  if (timeRange === "6months") {
    return new Date(now.getFullYear(), now.getMonth() - 5, 1)
  }
  if (timeRange === "1year") {
    return new Date(now.getFullYear() - 1, now.getMonth(), 1)
  }
  return new Date(now.getFullYear(), now.getMonth() - 2, 1)
}

export function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState("3months")

  const [calendarType, setCalendarType] = useState<"ad" | "bs">("ad")
  useEffect(() => {
    const stored = localStorage.getItem("calendarTypeAnalytics")
    if (stored !== null) {
      setCalendarType(stored)
    }
  }, [])

  const { transactions, loading } = useTransactions()
  const { expenseCategories, incomeCategories } = useCategories()

  // --- FILTER transactions ---
  const now = new Date()
  const startDate = getStartDate(timeRange)

  const filteredTransactions = transactions.filter((t) => {
    const adDate = new Date(t.date)
    const bsDate = new NepaliDate(adDate).getBS()

    // match if within AD range
    const matchAD = adDate >= startDate && adDate <= now

    // match if within BS equivalent range
    const startBS = new NepaliDate(startDate).getBS()
    const matchBS =
      (bsDate.year > startBS.year ||
        (bsDate.year === startBS.year && bsDate.month >= startBS.month)) &&
      (bsDate.year < new NepaliDate(now).getBS().year ||
        (bsDate.year === new NepaliDate(now).getBS().year &&
          bsDate.month <= new NepaliDate(now).getBS().month))
    return (calendarType === "ad" && matchAD) || (calendarType === "bs" && matchBS)
  })

  // --- METRICS ---
  const totalIncome = filteredTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpenses = filteredTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0)

  const balance = totalIncome - totalExpenses
  const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0

  // category breakdown
  const incomeCategoryMap = filteredTransactions.reduce((acc, t) => {
    if (t.type !== "income") return acc
    acc[t.category] = (acc[t.category] || 0) + t.amount
    return acc
  }, {} as Record<string, number>)

  const expenseCategoryMap = filteredTransactions.reduce((acc, t) => {
    if (t.type !== "expense") return acc
    acc[t.category] = (acc[t.category] || 0) + t.amount
    return acc
  }, {} as Record<string, number>)

  const categoryMap = {
    ...incomeCategoryMap,
    ...expenseCategoryMap,
  }

  const incomeCategoryBreakdown = Object.entries(incomeCategoryMap).map(([categoryId, amount]) => {
    const catInfo = [...expenseCategories, ...incomeCategories].find((c) => c.id === categoryId)
    return {
      category: catInfo?.name || categoryId,
      amount,
      color: catInfo?.color || "bg-gray-500",
    }
  })

  const expenseCategoryBreakdown = Object.entries(expenseCategoryMap).map(([categoryId, amount]) => {
    const catInfo = [...expenseCategories, ...incomeCategories].find((c) => c.id === categoryId)
    return {
      category: catInfo?.name || categoryId,
      amount,
      color: catInfo?.color || "bg-gray-500",
    }
  })

  const categoryBreakdown = (() => {
    let totalIncome = 0;
    let totalExpenses = 0;

    for (const [categoryId, amount] of Object.entries(categoryMap)) {
      const expenseCat = expenseCategories.find((c) => c.id === categoryId);
      const incomeCat = incomeCategories.find((c) => c.id === categoryId);

      if (expenseCat) totalExpenses += amount;
      if (incomeCat) totalIncome += amount;
    }

    return [
      {
        category: "Income",
        amount: totalIncome,
        color: "green"
      },
      {
        category: "Expenses",
        amount: totalExpenses,
        color: "red"
      }
    ];
  })();

  // top categories (by expense only)
  const expenseCategoriesTop = filteredTransactions.filter((t) => t.type === "expense")
  const expenseTotals = expenseCategoriesTop.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount
    return acc
  }, {} as Record<string, number>)
  const topCategoriesExpense = Object.entries(expenseTotals)
    .map(([categoryId, amount]) => {
      const catInfo = expenseCategories.find((c) => c.id === categoryId)
      const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
      return {
        category: catInfo?.name || categoryId,
        amount,
        percentage,
      }
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  // top categories (by income only)
  const incomeCategoriesTop = filteredTransactions.filter((t) => t.type === "income")
  const incomeTotals = incomeCategoriesTop.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount
    return acc
  }, {} as Record<string, number>)
  const topCategoriesIncome = Object.entries(incomeTotals)
    .map(([categoryId, amount]) => {
      const catInfo = incomeCategories.find((c) => c.id === categoryId)
      const percentage = totalIncome > 0 ? (amount / totalIncome) * 100 : 0
      return {
        category: catInfo?.name || categoryId,
        amount,
        percentage,
      }
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  // monthly trend (income vs expense per month)
  const monthlyTrendMapAD: Record<string, { income: number; expense: number }> = {}
  const monthlyTrendMapBS: Record<string, { income: number; expense: number }> = {}

  filteredTransactions.forEach((t) => {
    const adDate = new Date(t.date)
    const bsDate = new NepaliDate(adDate).getBS()

    // AD key -> yyyy-mm
    const adKey = `${adDate.getFullYear()}-${adDate.getMonth() + 1}`

    // BS key -> yyyy-mm
    const bsKey = `${bsDate.year}-${bsDate.month + 1}`

    // Init AD bucket
    if (!monthlyTrendMapAD[adKey]) {
      monthlyTrendMapAD[adKey] = { income: 0, expense: 0 }
    }

    // Init BS bucket
    if (!monthlyTrendMapBS[bsKey]) {
      monthlyTrendMapBS[bsKey] = { income: 0, expense: 0 }
    }

    // Update both AD & BS maps
    if (t.type === "income") {
      monthlyTrendMapAD[adKey].income += t.amount
      monthlyTrendMapBS[bsKey].income += t.amount
    } else {
      monthlyTrendMapAD[adKey].expense += t.amount
      monthlyTrendMapBS[bsKey].expense += t.amount
    }
  })

  const monthlyTrend = Object.entries(calendarType === "ad" ? monthlyTrendMapAD : monthlyTrendMapBS).map(([month, values]) => ({
    month,
    income: values.income,
    expenses: values.expense,
  }))

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Analytics</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between max-sm:flex-col max-sm:gap-4 max-sm:items-start">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Detailed insights into your financial patterns and trends.</p>
        </div>
        <div className="flex gap-2">
          <Select value={calendarType} onValueChange={(val: "ad" | "bs") => {setCalendarType(val); localStorage.setItem("calendarTypeAnalytics", val)}}>
            <SelectTrigger className="w-[75px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ad">AD</SelectItem>
              <SelectItem value="bs">BS</SelectItem>
            </SelectContent>
          </Select>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">Last 3 months</SelectItem>
              <SelectItem value="6months">Last 6 months</SelectItem>
              <SelectItem value="1year">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{getCurrency()} {totalIncome.toLocaleString("en-IN", {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            <p className="text-xs text-muted-foreground">In selected period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{getCurrency()} {totalExpenses.toLocaleString("en-IN", {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            <p className="text-xs text-muted-foreground">In selected period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Savings</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{getCurrency()} {balance.toLocaleString("en-IN", {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            <p className="text-xs text-muted-foreground">In selected period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Savings Rate</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{savingsRate.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">Of total income</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 w-full max-w-full overflow-x-hidden">
          <div className="grid gap-4 w-full grid-cols-1">

            <Card className="w-full overflow-x-auto p-6">
              <CardHeader className="w-full px-0">
                <CardTitle>Income vs Expenses</CardTitle>
                <CardDescription>
                  Visual comparison of your income and expenses proportionally
                </CardDescription>
              </CardHeader>

              <CardContent className="w-full overflow-x-auto px-0">
                {categoryBreakdown.length > 0 ? (
                  <CategoryChart data={categoryBreakdown} category="all" />
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No category data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="w-full overflow-x-auto p-6">
              <CardHeader className="w-full px-0">
                <CardTitle>Income vs Expenses</CardTitle>
                <CardDescription>
                  Monthly comparison of your income and expenses
                </CardDescription>
              </CardHeader>

              <CardContent className="w-full overflow-x-auto px-0">
                <IncomeVsExpenseChart type={calendarType} data={monthlyTrend} />
              </CardContent>
            </Card>

            <Card className="w-full overflow-x-auto p-6">
              <CardHeader className="w-full px-0">
                <CardTitle>Category Distribution</CardTitle>
                <CardDescription>
                  Visual breakdown of transaction amounts by category
                </CardDescription>
              </CardHeader>

              <CardContent className="w-full overflow-x-auto px-0">
                {categoryBreakdown.length > 0 ? (
                  <div className="flex flex-col gap-10 w-full">
                    <ExpenseIncomeChart
                      data={expenseCategoryBreakdown}
                      category="Expenses"
                    />
                    <ExpenseIncomeChart
                      data={incomeCategoryBreakdown}
                      category="Income"
                    />
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No spending data available
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4 w-full overflow-x-hidden">
          <div className="grid gap-4 grid-cols-1 w-full">
            
            {/* Expense Categories */}
            <Card className="w-full overflow-x-auto p-6">
              <CardHeader className="w-full px-0">
                <CardTitle>Expense Categories</CardTitle>
                <CardDescription>Breakdown of your spending by category</CardDescription>
              </CardHeader>
              <CardContent className="w-full overflow-x-auto px-0">
                {categoryBreakdown.length > 0 ? (
                  <CategoryChart data={expenseCategoryBreakdown} category="expenses" />
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No expense data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Income Categories */}
            <Card className="w-full overflow-x-auto p-6">
              <CardHeader className="w-full px-0">
                <CardTitle>Income Categories</CardTitle>
                <CardDescription>Breakdown of your earnings by category</CardDescription>
              </CardHeader>
              <CardContent className="w-full overflow-x-auto px-0">
                {categoryBreakdown.length > 0 ? (
                  <CategoryChart data={incomeCategoryBreakdown} category="incomes" />
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No income data available
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* Top Expense Categories */}
          <Card className="p-6">
            <CardHeader className="px-0">
              <CardTitle>Top Expense Categories</CardTitle>
              <CardDescription>Your highest expense categories this period</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <div className="space-y-4">
                {topCategoriesExpense.length > 0 ? (
                  topCategoriesExpense.map((category, index) => (
                    <div key={category.category} className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{category.category}</p>
                          <p className="text-sm text-muted-foreground">
                            {category.percentage.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <p className="font-medium">
                          {getCurrency()}{" "}
                          {category.amount.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No expense categories available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Income Categories */}
          <Card className="p-6">
            <CardHeader className="px-0">
              <CardTitle>Top Income Categories</CardTitle>
              <CardDescription>Your highest income categories this period</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <div className="space-y-4">
                {topCategoriesIncome.length > 0 ? (
                  topCategoriesIncome.map((category, index) => (
                    <div key={category.category} className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{category.category}</p>
                          <p className="text-sm text-muted-foreground">
                            {category.percentage.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <p className="font-medium">
                          {getCurrency()}{" "}
                          {category.amount.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No income categories available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent
          value="trends"
          className="space-y-4 w-full overflow-x-hidden mb-4"
        >
          <div className="grid gap-4 grid-cols-1 w-full">
            <Card className="flex flex-col w-full overflow-hidden p-6">
              <CardHeader className="w-full px-0">
                <CardTitle>Financial Trends</CardTitle>
                <CardDescription>
                  Track your financial patterns over time
                </CardDescription>
              </CardHeader>

              {/* Allow chart/content to scroll if wider than screen */}
              <CardContent className="w-full overflow-x-auto px-0">
                <div className="min-w-[320px]">
                  <TrendChart type={calendarType} data={monthlyTrend} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
