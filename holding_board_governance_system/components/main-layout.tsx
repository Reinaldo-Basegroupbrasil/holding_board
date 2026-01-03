"use client"

import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/sidebar"

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // Lista de páginas onde a Sidebar NÃO deve aparecer
  const isAuthPage = pathname === '/login' || pathname === '/auth' || pathname === '/register'

  return (
    <div className="h-full relative">
      
      {/* SÓ MOSTRA SIDEBAR SE NÃO FOR PÁGINA DE LOGIN */}
      {!isAuthPage && (
        <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80]">
          <Sidebar />
        </div>
      )}

      {/* AJUSTA O PADDING (MARGEM) SE TIVER SIDEBAR OU NÃO */}
      <main className={`h-full ${!isAuthPage ? "md:pl-72" : ""}`}>
        {children}
      </main>
      
    </div>
  )
}