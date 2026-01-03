"use client"

import { useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Loader2, LogIn, ShieldCheck } from "lucide-react"

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
      setError(error.message)
      setLoading(false)
    } else {
      // Login com sucesso, redireciona para o Cockpit
      router.refresh()
      router.push("/") 
    }
  }

  // Função auxiliar para criar conta (apenas para facilitar seu primeiro acesso)
  const handleSignUp = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    if (error) {
        setError(error.message)
    } else {
        alert("Conta criada! Se o 'Confirm Email' estiver ligado no Supabase, verifique sua caixa de entrada. Se não, faça login agora.")
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      
      {/* Background Effect */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-indigo-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[100px]" />
      </div>

      <Card className="w-full max-w-md border-slate-800 bg-slate-900/80 backdrop-blur-xl text-white z-10 shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
            <span className="text-slate-900 font-black text-2xl">H</span>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Holding Board</CardTitle>
          <CardDescription className="text-slate-400">
            Governança Corporativa e Gestão de Portfólio
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail Corporativo</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="nome@basegroupbrasil.com" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-950/50 border-slate-800 focus:border-indigo-500 text-white placeholder:text-slate-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha de Acesso</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-950/50 border-slate-800 focus:border-indigo-500 text-white"
              />
            </div>

            {error && (
                <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium text-center">
                    {error}
                </div>
            )}

            <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-5">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="flex items-center gap-2"><LogIn className="w-4 h-4" /> Acessar Sistema</span>}
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-4 border-t border-slate-800 pt-6">
            <div className="text-center">
                <p className="text-xs text-slate-500 mb-2">Primeiro acesso?</p>
                <Button variant="outline" size="sm" onClick={handleSignUp} disabled={loading} className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
                    Criar Conta (Auto-Cadastro)
                </Button>
            </div>
            
            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-600 mt-2">
                <ShieldCheck className="w-3 h-3" />
                Ambiente Seguro • Criptografia End-to-End
            </div>
        </CardFooter>
      </Card>
    </div>
  )
}