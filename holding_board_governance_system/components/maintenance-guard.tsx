"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { usePathname } from "next/navigation" // <--- Importante para checar a rota
import { AlertTriangle, Hammer, Loader2, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const [isMaintenance, setIsMaintenance] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  
  const pathname = usePathname() // Pega a página atual

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    // Escuta mudanças de login/logout em tempo real
    const checkAccess = async () => {
      try {
        // 1. Verifica Manutenção
        const { data: setting } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'maintenance_mode')
          .single()

        const maintenanceActive = setting?.value === 'true'
        setIsMaintenance(maintenanceActive)

        // 2. Verifica Usuário
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()
            
            if (profile?.role === 'admin') {
                setIsAdmin(true)
            } else {
                setIsAdmin(false)
            }
        } else {
            setIsAdmin(false)
        }

      } catch (error) {
        console.error("Erro no guardião:", error)
      } finally {
        setLoading(false)
      }
    }

    checkAccess()

    // Ouve mudanças de auth (Login/Logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
        checkAccess()
    })

    return () => {
        authListener.subscription.unsubscribe()
    }
  }, [supabase])

  // Se for a página de Login, LIBERA SEMPRE (senão ninguém entra pra desligar a manutenção)
  if (pathname === '/login' || pathname === '/auth') {
      return <>{children}</>
  }

  if (loading) {
    return (
        <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
    )
  }

  // BLOQUEIO: Se está em manutenção E NÃO é admin
  if (isMaintenance && !isAdmin) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-white p-4 text-center relative overflow-hidden">
        {/* Fundo animado sutil */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
        
        <div className="z-10 flex flex-col items-center max-w-lg">
            <div className="bg-amber-500/10 p-5 rounded-full mb-8 border border-amber-500/20 ring-4 ring-amber-500/5 animate-pulse">
                <Hammer className="w-12 h-12 text-amber-500" />
            </div>
            
            <h1 className="text-4xl font-extrabold tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400">
                Sistema em Manutenção
            </h1>
            
            <p className="text-slate-400 text-lg mb-8 leading-relaxed">
              Estamos realizando atualizações críticas de segurança e melhorias na plataforma. 
              O acesso está temporariamente restrito aos administradores.
            </p>
            
            <div className="flex flex-col gap-4 w-full items-center">
                <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-950/30 px-4 py-2 rounded-full border border-amber-900/50">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Previsão de retorno: Em breve</span>
                </div>

                <div className="mt-8 pt-8 border-t border-slate-800 w-full flex justify-center">
                    <Link href="/login">
                        <Button variant="ghost" className="text-slate-500 hover:text-white hover:bg-slate-800 gap-2 text-xs">
                            <LogIn className="w-3.5 h-3.5" /> Sou Administrador (Entrar)
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}