"use client"

import { useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Loader2, Briefcase, Users } from "lucide-react"

// AQUI ESTAVA O ERRO: O nome da função precisa ser ProviderModal para bater com a página
export function ProviderModal() { 
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
    const type = formData.get('type')

    const payload = {
      name: formData.get('name'),
      type: type,
      capacity_slots: 999,
    }

    const { error } = await supabase.from('providers').insert(payload)

    setLoading(false)
    if (!error) {
        setOpen(false)
        router.refresh()
    } else {
        alert("Erro ao criar: " + error.message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-slate-900 hover:bg-slate-800 text-white gap-2 font-bold shadow-sm text-xs h-9">
            <Plus className="w-4 h-4" /> Novo Parceiro
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[450px] bg-white dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-indigo-600" />
            Novo Parceiro / Prestador
          </DialogTitle>
          <DialogDescription>
            Cadastre uma pessoa ou empresa prestadora de serviço.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="grid gap-5 py-4">
          
          <div className="grid gap-2">
            <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">Nome</Label>
            <Input name="name" required placeholder="Ex: Dr. Silva, Atlas Soft Labs" className="font-medium" />
          </div>

          <div className="grid gap-2">
            <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">Tipo</Label>
            <Select name="type" defaultValue="EXTERNAL_PARTNER">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="INTERNAL_SQUAD">
                        <div className="flex items-center gap-2"><Users className="w-3 h-3" /> Squad Interno</div>
                    </SelectItem>
                    <SelectItem value="EXTERNAL_PARTNER">
                        <div className="flex items-center gap-2"><Briefcase className="w-3 h-3" /> Parceiro</div>
                    </SelectItem>
                </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}