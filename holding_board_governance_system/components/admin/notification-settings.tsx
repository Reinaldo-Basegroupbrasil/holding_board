"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Save, Bell, Loader2 } from "lucide-react"

export function NotificationSettings() {
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  
  // Estado local das configurações
  const [settings, setSettings] = useState({
    notify_docs: false,
    notify_weekly: false,
    notify_critical: false
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // 1. CARREGAR CONFIGURAÇÕES DO BANCO
  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase.from('app_settings').select('*')
      
      if (data) {
        // Converte o array do banco em um objeto fácil de usar
        const newSettings: any = { ...settings }
        data.forEach((item: any) => {
            if (item.value === 'true') newSettings[item.key] = true
            if (item.value === 'false') newSettings[item.key] = false
        })
        setSettings(newSettings)
      }
      setFetching(false)
    }
    loadSettings()
  }, [])

  // 2. SALVAR NO BANCO
  const handleSave = async () => {
    setLoading(true)
    
    // Prepara os dados para o formato do banco (Key/Value)
    const updates = [
        { key: 'notify_docs', value: String(settings.notify_docs) },
        { key: 'notify_weekly', value: String(settings.notify_weekly) },
        { key: 'notify_critical', value: String(settings.notify_critical) }
    ]

    const { error } = await supabase.from('app_settings').upsert(updates)

    setLoading(false)
    if (!error) {
        alert("Preferências salvas com sucesso!")
    } else {
        alert("Erro ao salvar: " + error.message)
    }
  }

  // Função auxiliar para mudar o estado local
  const toggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }))
  }

  if (fetching) {
      return <div className="p-8 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /> Carregando preferências...</div>
  }

  return (
    <div className="bg-white p-6 rounded-lg border shadow-sm space-y-6">
        <div className="flex items-start gap-4">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><Bell className="w-5 h-5" /></div>
            <div>
                <h3 className="text-base font-bold text-slate-800">Alertas por E-mail</h3>
                <p className="text-sm text-slate-500">Defina quando o sistema deve enviar avisos automáticos.</p>
            </div>
        </div>

        <div className="space-y-4 pt-2">
            
            <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50/50">
                <div className="space-y-0.5">
                    <Label className="text-sm font-bold text-slate-700">Vencimento de Documentos</Label>
                    <p className="text-xs text-slate-500">Avisar 30 dias e 7 dias antes do vencimento.</p>
                </div>
                <Switch 
                    checked={settings.notify_docs} 
                    onCheckedChange={() => toggle('notify_docs')} 
                />
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50/50">
                <div className="space-y-0.5">
                    <Label className="text-sm font-bold text-slate-700">Resumo Semanal</Label>
                    <p className="text-xs text-slate-500">Relatório de pendências toda segunda-feira.</p>
                </div>
                <Switch 
                    checked={settings.notify_weekly} 
                    onCheckedChange={() => toggle('notify_weekly')} 
                />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50/50">
                <div className="space-y-0.5">
                    <Label className="text-sm font-bold text-slate-700">Alterações Críticas</Label>
                    <p className="text-xs text-slate-500">Avisar quando alguém excluir uma empresa.</p>
                </div>
                <Switch 
                    checked={settings.notify_critical} 
                    onCheckedChange={() => toggle('notify_critical')} 
                />
            </div>
        </div>

        <div className="pt-2 border-t border-slate-50 mt-4 flex justify-end">
            <Button onClick={handleSave} disabled={loading} className="bg-slate-900 text-white font-bold">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Preferências"} 
                {!loading && <Save className="w-4 h-4 ml-2" />}
            </Button>
        </div>
    </div>
  )
}