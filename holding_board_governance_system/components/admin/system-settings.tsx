"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Save, Mail, Loader2 } from "lucide-react"

export function SystemSettings() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const loadSettings = async () => {
        const { data } = await supabase.from('app_settings').select('value').eq('key', 'admin_email').single()
        if (data) setEmail(data.value)
        setFetching(false)
    }
    loadSettings()
  }, [])

  const handleSave = async () => {
    setLoading(true)
    const { error } = await supabase.from('app_settings').upsert({ key: 'admin_email', value: email })
    setLoading(false)
    if (!error) alert("Email administrativo atualizado!")
  }

  return (
    <div className="bg-white p-6 rounded-lg border shadow-sm space-y-6">
        <div className="flex items-start gap-4">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Mail className="w-5 h-5" /></div>
            <div>
                <h3 className="text-base font-bold text-slate-800">Canais de Contato</h3>
                <p className="text-sm text-slate-500">Para onde os alertas críticos devem ser enviados.</p>
            </div>
        </div>

        <div className="space-y-4 max-w-lg">
            <div className="grid gap-2">
                <Label>E-mail Administrativo (Master)</Label>
                {fetching ? (
                    <div className="h-10 w-full bg-slate-100 animate-pulse rounded" />
                ) : (
                    <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="ex: diretoria@holding.com" />
                )}
                <p className="text-[10px] text-slate-400">Este e-mail receberá cópias de segurança e alertas de falha.</p>
            </div>
            
            <Button onClick={handleSave} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Email"}
            </Button>
        </div>
    </div>
  )
}