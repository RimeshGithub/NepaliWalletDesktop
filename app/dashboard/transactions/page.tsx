"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { TransactionsList } from "@/components/transactions-list"

export default function TransactionsPage() {
  return (
    <DashboardLayout>
      <TransactionsList />
    </DashboardLayout>
  )
}
