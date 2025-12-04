"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { AddTransactionForm } from "@/components/add-transaction-form"

export default function AddTransactionPage() {
  return (
      <DashboardLayout>
        <div className="w-full mr-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Add Transaction</h1>
            <p className="text-muted-foreground">Record a new income or expense transaction.</p>
          </div>
          <AddTransactionForm />
        </div>
      </DashboardLayout>
  )
}
