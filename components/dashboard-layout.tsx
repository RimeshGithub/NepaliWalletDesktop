"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  Home,
  Plus,
  TrendingUp,
  Settings,
  Download,
  Menu,
  Wallet,
  PieChart,
  Cloud,
  CloudOff,
  ArrowUpDown,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { useFirebaseSync } from "@/hooks/use-firebase-sync"
import { useSidebarStore } from "@/hooks/use-sidebar-store"

interface DashboardLayoutProps {
  children: React.ReactNode
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Add Transaction", href: "/dashboard/add", icon: Plus },
  { name: "Transactions", href: "/dashboard/transactions", icon: ArrowUpDown },
  { name: "Accounts", href: "/dashboard/accounts", icon: Wallet },
  { name: "Analytics", href: "/dashboard/analytics", icon: PieChart },
  { name: "Downloads", href: "/dashboard/downloads", icon: Download },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
]

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const scrollRef = useRef(null)

  const { isOpen, open, close } = useSidebarStore()

  const { user, setupAuthListener } = useFirebaseAuth()
  const { isSyncing, isOnline } = useFirebaseSync(user?.uid || null)

  // Firebase auth listener
  useEffect(() => {
    const unsubscribe = setupAuthListener()
    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [setupAuthListener])

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={cn("flex flex-col h-full overflow-auto", mobile ? "py-4" : "")}>
      <div className="flex items-center gap-2 px-7 py-6">
        <Wallet className="h-8 w-8 text-primary" />
        <span className="text-xl font-bold">NepaliWallet</span>
      </div>

      <nav className="flex-1 px-4 space-y-2 mb-5">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => mobile && close()}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-4 border-t space-y-2">
        {user && (
          <div className="text-xs space-y-1">
            <div className="flex items-center gap-2 py-2 justify-center">
              {isSyncing ? (
                <>
                  <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-muted-foreground">Syncing...</span>
                </>
              ) : isOnline ? (
                <>
                  <Cloud className="h-4 w-4 text-green-500" />
                  <span className="text-muted-foreground">Cloud Sync Active</span>
                </>
              ) : (
                <>
                  <CloudOff className="h-4 w-4 text-yellow-500" />
                  <span className="text-muted-foreground">Offline Mode</span>
                </>
              )}
            </div>
          </div>
        )}
        <div className="text-xs text-muted-foreground py-2 text-center">
          {user ? `Logged in as ${user.email}` : "Local Storage Mode"}
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:bg-card pt-3">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={isOpen} onOpenChange={(v) => (v ? open() : close())}>
        <SheetContent side="left" className="p-0 w-64 pt-2">
          <Sidebar mobile />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-2 border-b bg-card">
          <Sheet open={isOpen} onOpenChange={(v) => (v ? open() : close())}>
            <SheetTrigger asChild>
              <Button variant="ghost" onClick={open} className="h-12 w-12">
                <Menu className="h-10 w-10" />
              </Button>
            </SheetTrigger>
          </Sheet>
          <div className="flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            <span className="font-bold">NepaliWallet</span>
          </div>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        {/* Page Content */}
        <main ref={scrollRef} className="flex-1 overflow-auto p-4 lg:p-6">
          {typeof children === "function"
            ? children({ scrollRef })
            : children
          }
        </main>
      </div>
    </div>
  )
}
