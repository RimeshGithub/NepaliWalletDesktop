"use client"

import type React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

export function FirebaseErrorBoundary({ children }: { children: React.ReactNode }) {
  const { firebaseError, isFirebaseReady } = useAuth()

  if (firebaseError || !isFirebaseReady) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Firebase Configuration Error</CardTitle>
            <CardDescription>There's an issue with the Firebase setup that needs to be resolved.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-mono text-muted-foreground">
                {firebaseError || "Firebase not properly initialized"}
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">To fix this issue:</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Go to Project Settings (gear icon in top right)</li>
                <li>Click on "Environment Variables"</li>
                <li>Add your Firebase configuration values</li>
                <li>Refresh the page</li>
              </ol>
            </div>
            <Button onClick={() => window.location.reload()} className="w-full" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
