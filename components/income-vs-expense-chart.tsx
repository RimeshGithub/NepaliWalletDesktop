"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Legend } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface IncomeVsExpenseChartProps {
  data: Array<{ month: string; income: number; expenses: number }>
  type: string
}

export function IncomeVsExpenseChart({ data, type }: IncomeVsExpenseChartProps) {
  const ADmonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const BSmonths = ["Baisakh", "Jestha", "Asar", "Shrawan", "Bhadra", "Ashwin", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"]

  const chartConfig = {
    income: {
      label: "Income",
      color: "green",
    },
    expenses: {
      label: "Expenses",
      color: "red",
    },
  }

  data = data.map((item) => {
    return {
      month: (type === "ad" ? ADmonths[item.month.split("-")[1] - 1] : BSmonths[item.month.split("-")[1] - 1]) + "\n" + item.month.split("-")[0],
      income: item.income,
      expenses: item.expenses,
    }
  })

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full min-w-3xl pr-5">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <XAxis dataKey="month" fontSize={10}/>
          <YAxis />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Legend />
          <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
