"use client"

import { useAdmin } from "@/hooks/use-admin"

export function AdminOnly({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAdmin()

  if (loading || !isAdmin) {
    return null
  }

  return <>{children}</>
}

export function RoleGate({ allowed, children }: { allowed: string[], children: React.ReactNode }) {
  const { role, loading } = useAdmin()

  if (loading || !role || !allowed.includes(role)) {
    return null
  }

  return <>{children}</>
}