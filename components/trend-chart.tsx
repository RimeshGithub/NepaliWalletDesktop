"use client"

import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Legend } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface TrendChartProps {
  data: Array<{ month: string; income: number; expenses: number }>
  type: string
}

export function TrendChart({ data, type }: TrendChartProps) {
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
    <ChartContainer config={chartConfig} className="h-[400px] w-full min-w-3xl pr-10">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <XAxis dataKey="month" fontSize={10} />
          <YAxis />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="income"
            stroke="var(--color-income)"
            strokeWidth={2}
            dot={{ fill: "var(--color-income)" }}
          />
          <Line
            type="monotone"
            dataKey="expenses"
            stroke="var(--color-expenses)"
            strokeWidth={2}
            dot={{ fill: "var(--color-expenses)" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
