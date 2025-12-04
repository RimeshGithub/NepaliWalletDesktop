"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface ExpenseChartProps {
  data: Array<{ category: string; amount: number; color: string }>
}

export function ExpenseChart({ data }: ExpenseChartProps) {
  const chartConfig = data.reduce(
    (config, item, index) => ({
      ...config,
      [item.category.toLowerCase()]: {
        label: item.category,
        color: `hsl(var(--chart-${(index % 5) + 1}))`,
      },
    }),
    {},
  )

  return (
    <ChartContainer config={chartConfig} className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <XAxis dataKey="category" />
          <YAxis />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="amount" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
