"use client"

import { useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PlusCircle, Loader2, Lightbulb } from "lucide-react"

export function NewThesisBtn() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    
    // Inserimos apenas o básico. O resto vai zerado/nulo para ser preenchido depois.
    const { error } = await supabase.from('theses').insert({
        title: formData.get('title'),
        description: formData.get('description'),
        // Valores padrão para iniciar "Em Branco"
        risk_legal: 0, 
        risk_tech: 0,
        capex_setup: 0,
        opex_monthly: 0,
        currency: 'USD', 
        status: 'DRAFT'
    })

    setLoading(false)
    if (!error) {
        setOpen(false)
        router.refresh()
    } else {
        alert("Erro: " + error.message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-md">
            <PlusCircle className="w-4 h-4" /> Nova Ideia
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            Capturar Nova Ideia
          </DialogTitle>
          <DialogDescription>
            Registre a ideia inicial. Os detalhes financeiros e de risco serão preenchidos durante a fase de pesquisa.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label className="text-slate-700 font-bold">Nome da Iniciativa</Label>
            <Input name="title" placeholder="Ex: Tokenização de Recebíveis" required className="text-lg" />
          </div>
          
          <div className="grid gap-2">
            <Label className="text-slate-700 font-bold">Descrição (O que é?)</Label>
            <Textarea 
                name="description" 
                placeholder="Descreva o conceito básico e o objetivo estratégico..." 
                rows={5} 
                required 
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading} className="w-full bg-slate-900 text-white">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Rascunho
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}