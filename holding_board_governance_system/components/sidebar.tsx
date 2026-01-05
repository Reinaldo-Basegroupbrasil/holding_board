"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { 
  LayoutDashboard, 
  Network, 
  Briefcase, 
  Factory, 
  FlaskConical, 
  Settings, 
  LogOut, 
  Loader2,
  Gavel,         // Ícone para Sala de Guerra
  ClipboardList, // Ícone para Minha Pauta
  DollarSign     // Ícone para Propostas & Contratos
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { createBrowserClient } from "@supabase/ssr"
import { useAdmin } from "@/hooks/use-admin" 

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  
  const { isAdmin, userEmail, loading } = useAdmin() 

  const handleLogout = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const routes = [
    {
      label: "Visão Executiva",
      icon: LayoutDashboard,
      href: "/",
      color: "text-sky-500",
      adminOnly: false,
    },
    {
      label: "Mapa Corporativo",
      icon: Network,
      href: "/structure",
      color: "text-violet-500",
      adminOnly: false,
    },
    {
      label: "Sala de Guerra",
      icon: Gavel,
      href: "/board/meetings",
      color: "text-amber-500",
      adminOnly: false, 
    },
    {
      label: "Minha Pauta",
      icon: ClipboardList,
      href: "/board/todo",
      color: "text-rose-500",
      adminOnly: false,
    },
    {
      label: "Propostas & Contratos", // NOVA SEÇÃO PARA GESTÃO FINANCEIRA
      icon: DollarSign,
      href: "/board/proposals",
      color: "text-blue-500",
      adminOnly: false, 
    },
    {
      label: "Portfólio Projetos",
      icon: Briefcase,
      href: "/portfolio",
      color: "text-pink-700",
      adminOnly: false,
    },
    {
      label: "Monitoramento SLA",
      icon: Factory,
      href: "/capacity",
      color: "text-orange-700",
      adminOnly: false,
    },
    {
      label: "Iniciativas",
      icon: FlaskConical,
      href: "/forge",
      color: "text-emerald-500",
      adminOnly: true, 
    },
    {
      label: "Painel Admin",
      icon: Settings,
      href: "/admin",
      color: "text-gray-400", 
      adminOnly: true, 
    },
  ]

  return (
    <div className="space-y-4 py-4 flex flex-col h-full bg-slate-900 text-white border-r border-slate-800">
      <div className="px-3 py-2 flex-1">
        <Link href="/" className="flex items-center pl-3 mb-14">
          <div className="relative w-8 h-8 mr-4">
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500 to-sky-500 rounded-lg opacity-75 animate-pulse" />
            <div className="relative w-full h-full bg-black rounded-lg border border-slate-700 flex items-center justify-center font-bold text-lg">
              H
            </div>
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            Holding Board
          </h1>
        </Link>
        
        <div className="space-y-1">
          {routes.map((route) => {
            if (loading && route.adminOnly) return null 
            if (route.adminOnly && !isAdmin) return null 

            return (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                  pathname === route.href ? "text-white bg-white/10" : "text-zinc-400"
                )}
              >
                <div className="flex items-center flex-1">
                  <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                  {route.label}
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      <div className="px-3 py-2 border-t border-slate-800">
          {loading ? (
             <div className="px-4 py-2 flex items-center gap-2 text-zinc-500 text-xs">
                <Loader2 className="w-3 h-3 animate-spin" /> Verificando...
             </div>
          ) : userEmail ? (
            <div className="px-4 py-2 mb-2">
                <p className="text-[10px] text-zinc-500 uppercase font-bold">Logado como</p>
                <p className="text-xs text-zinc-300 truncate font-medium" title={userEmail}>
                    {userEmail}
                </p>
                <p className={`text-[9px] mt-0.5 font-bold uppercase ${isAdmin ? 'text-emerald-500' : 'text-blue-400'}`}>
                    {isAdmin ? "Super Admin" : "Executive Board / Member"}
                </p>
            </div>
          ) : null}

          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="w-full justify-start text-zinc-400 hover:text-white hover:bg-white/10"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Sair
          </Button>
      </div>
    </div>
  )
}