"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { AccountsList } from "@/components/accounts-list"

export default function AccountsPage() {
  return (
    <DashboardLayout>
      <AccountsList />
    </DashboardLayout>
  )
}
