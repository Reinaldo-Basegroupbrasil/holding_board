"use client"

import { useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Loader2, LogIn, ShieldCheck, Mail } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      // Mensagem mais amigável para erro de credenciais
      setError(error.message === "Invalid login credentials" 
        ? "E-mail ou senha incorretos. Verifique seus dados." 
        : error.message)
      setLoading(false)
    } else {
      router.refresh()
      router.push("/") 
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      
      {/* Efeito de Fundo Premium */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[100px]" />
      </div>

      <Card className="w-full max-w-md border-slate-800 bg-slate-900/60 backdrop-blur-2xl text-white z-10 shadow-2xl">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-indigo-500/10">
            <span className="text-slate-900 font-black text-3xl">H</span>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">Holding Board</CardTitle>
          <CardDescription className="text-slate-400 font-medium">
            Sistema de Governança Corporativa
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">E-mail Corporativo</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="nome@basegroupbrasil.com" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-950/40 border-slate-800 focus:ring-1 focus:ring-indigo-500 text-white transition-all"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password text-slate-300">Senha</Label>
              </div>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-950/40 border-slate-800 focus:ring-1 focus:ring-indigo-500 text-white transition-all"
              />
            </div>

            {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold text-center animate-in fade-in zoom-in duration-300">
                    {error}
                </div>
            )}

            <Button type="submit" disabled={loading} className="w-full bg-white hover:bg-slate-200 text-slate-900 font-bold py-6 transition-all active:scale-[0.98]">
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" /> Entrar no Cockpit
                </span>
              )}
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-4 border-t border-slate-800/50 pt-6 mt-2">
            <div className="text-center space-y-3">
                <p className="text-[11px] text-slate-500 uppercase tracking-widest font-bold">
                  Acesso Restrito
                </p>
                <div className="flex flex-col items-center gap-1">
                  <p className="text-[10px] text-slate-400">Esqueceu sua senha ou precisa de acesso?</p>
                  <a 
                    href="mailto:reinaldo.goncalves@basegroupbrasil.com" 
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                  >
                    <Mail className="w-3 h-3" /> Contatar Administrador
                  </a>
                </div>
            </div>
            
            <div className="flex items-center justify-center gap-2 text-[9px] text-slate-600 mt-2 uppercase tracking-tighter">
                <ShieldCheck className="w-3 h-3 text-emerald-500/50" />
                Segurança de Dados • Base Group Brasil
            </div>
        </CardFooter>
      </Card>
    </div>
  )
}