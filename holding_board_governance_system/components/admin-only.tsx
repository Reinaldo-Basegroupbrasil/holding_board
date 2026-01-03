"use client"

import { useAdmin } from "@/hooks/use-admin"

export function AdminOnly({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAdmin()

  // Enquanto carrega ou se não for admin, não renderiza nada (null)
  if (loading || !isAdmin) {
    return null
  }

  // Se for admin, renderiza o que estiver dentro
  return <>{children}</>
}