"use client"

import { useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FlaskConical, Edit2, Save, Clock, Gavel, Cpu, Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { ThesisActions } from "./thesis-actions"

// Helper para mostrar "A definir" se for zero
const formatCurrencyState = (val: number, currency = 'USD') => {
    if (!val || val === 0) return <span className="text-slate-400 italic text-sm">Em análise</span>
    
    return new Intl.NumberFormat('pt-BR', { 
        style: 'currency', 
        currency: currency, 
        maximumFractionDigits: 0 
    }).format(val)
}

const formatTime = (time: string) => {
    if (!time) return '-'
    if (!isNaN(Number(time))) return `${time} meses`
    return time
}

export function ThesisCard({ thesis }: { thesis: any }) {
    const [isEditing, setIsEditing] = useState(false)
    const [loading, setLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const router = useRouter()

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Verifica se a tese está incompleta (para avisos visuais)
    const isIncomplete = thesis.capex_setup === 0 || thesis.risk_legal === 0;

    const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)

        const { error } = await supabase.from('theses').update({
            title: formData.get('title'),
            description: formData.get('description'),
            expected_time: formData.get('expected_time'),
            risk_legal: Number(formData.get('risk_legal')),
            risk_tech: Number(formData.get('risk_tech')),
            capex_setup: Number(formData.get('capex')),
            opex_monthly: Number(formData.get('opex')),
            currency: formData.get('currency'),
        }).eq('id', thesis.id)

        setLoading(false)
        if (!error) {
            setIsEditing(false)
            router.refresh()
        } else {
            alert("Erro: " + error.message)
        }
    }

    const handleDelete = async () => {
        const confirmacao = window.confirm("⚠️ TEM CERTEZA?\n\nIsso vai apagar a tese permanentemente.")
        if (!confirmacao) return
        setLoading(true)
        const { error } = await supabase.from('theses').delete().eq('id', thesis.id)
        if (!error) {
            setIsOpen(false)
            router.refresh()
        } else {
            alert("Erro: " + error.message)
            setLoading(false)
        }
    }

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Card className={`flex flex-col border-t-4 hover:shadow-xl transition-all hover:-translate-y-1 bg-white dark:bg-slate-900 cursor-pointer group h-full ${
                    isIncomplete ? 'border-t-slate-300' : 'border-t-slate-800'
                }`}>
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex gap-2">
                                <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">{thesis.status}</Badge>
                                {isIncomplete && thesis.status === 'DRAFT' && (
                                    <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200 bg-amber-50">
                                        Em Pesquisa
                                    </Badge>
                                )}
                            </div>
                            <span className="text-[10px] text-slate-300 font-mono">ID: {thesis.id.slice(0,4)}</span>
                        </div>
                        <CardTitle className="text-xl text-slate-900 dark:text-slate-100 leading-tight">
                            {thesis.title}
                        </CardTitle>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                            <Clock className="w-3 h-3" /> 
                            {formatTime(thesis.expected_time) || <span className="italic">A definir</span>}
                        </div>
                    </CardHeader>

                    <CardContent className="flex-1 space-y-5 pt-2">
                        {/* Riscos - Mostra mensagem se for 0 */}
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs font-medium text-slate-600">
                                    <span className="flex items-center gap-1"><Gavel className="w-3 h-3" /> Jurídico</span>
                                    <span>{thesis.risk_legal > 0 ? `${thesis.risk_legal}/5` : '-'}</span>
                                </div>
                                {thesis.risk_legal > 0 ? (
                                    <Progress value={(thesis.risk_legal / 5) * 100} className="h-1.5 [&>div]:bg-amber-500 bg-slate-100" />
                                ) : (
                                    <div className="h-1.5 w-full bg-slate-100 rounded overflow-hidden"><div className="h-full bg-slate-200 w-full animate-pulse"></div></div>
                                )}
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs font-medium text-slate-600">
                                    <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> Tecnológico</span>
                                    <span>{thesis.risk_tech > 0 ? `${thesis.risk_tech}/5` : '-'}</span>
                                </div>
                                {thesis.risk_tech > 0 ? (
                                    <Progress value={(thesis.risk_tech / 5) * 100} className="h-1.5 [&>div]:bg-blue-500 bg-slate-100" />
                                ) : (
                                    <div className="h-1.5 w-full bg-slate-100 rounded overflow-hidden"><div className="h-full bg-slate-200 w-full animate-pulse"></div></div>
                                )}
                            </div>
                        </div>

                        <Separator className="bg-slate-100 dark:bg-slate-800" />

                        {/* Financeiro */}
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div>
                                <p className="text-[10px] uppercase text-slate-400 font-bold mb-0.5">Capex</p>
                                <div className="font-bold text-slate-900 dark:text-white">
                                    {formatCurrencyState(thesis.capex_setup, thesis.currency)}
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase text-slate-400 font-bold mb-0.5">Opex</p>
                                <div className="font-bold text-slate-900 dark:text-white">
                                    {formatCurrencyState(thesis.opex_monthly, thesis.currency)}
                                </div>
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800 mt-auto">
                        {thesis.status === 'DRAFT' ? (
                            <div onClick={(e) => e.stopPropagation()} className="w-full">
                                {isIncomplete && (
                                    <p className="text-[10px] text-center text-amber-600 mb-2 flex justify-center items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" /> Complete os dados para aprovar
                                    </p>
                                )}
                                <ThesisActions id={thesis.id} title={thesis.title} capex={thesis.capex_setup} />
                            </div>
                        ) : (
                            <div className={`w-full text-center py-2 text-xs font-bold uppercase rounded mt-4 ${
                                thesis.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                            }`}>
                                {thesis.status === 'APPROVED' ? 'Convertida em Projeto' : 'Arquivada'}
                            </div>
                        )}
                    </CardFooter>
                </Card>
            </SheetTrigger>

            {/* GAVETA LATERAL DE EDIÇÃO */}
            <SheetContent className="sm:max-w-xl overflow-y-auto px-6">
                <SheetHeader className="mb-6 pt-4">
                    <SheetTitle className="text-2xl flex items-center gap-2">
                        <FlaskConical className="w-6 h-6 text-emerald-600" />
                        Detalhes da Tese
                    </SheetTitle>
                    <SheetDescription>
                        Use este espaço para refinar os dados conforme a pesquisa avança.
                    </SheetDescription>
                </SheetHeader>

                {!isEditing ? (
                    // MODO LEITURA
                    <div className="space-y-6 pb-8">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">{thesis.title}</h3>
                            <div className="flex gap-2 mt-2 items-center">
                                <Badge>{thesis.status}</Badge>
                                <Badge variant="outline">{thesis.currency || 'USD'}</Badge>
                            </div>
                        </div>

                        {isIncomplete && thesis.status === 'DRAFT' && (
                            <div className="bg-amber-50 border border-amber-200 p-3 rounded-md flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-bold text-amber-800">Dados Pendentes</h4>
                                    <p className="text-xs text-amber-700">Esta tese ainda não tem valores financeiros ou riscos definidos. Edite para completar a análise.</p>
                                </div>
                            </div>
                        )}

                        <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-lg border border-slate-200">
                            <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Estudo de Viabilidade</h4>
                            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                {thesis.description || "Descrição pendente."}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="border p-4 rounded-lg bg-white shadow-sm">
                                <p className="text-xs text-slate-500 font-semibold uppercase">Capex Setup</p>
                                <p className="text-2xl font-bold text-slate-900">{formatCurrencyState(thesis.capex_setup, thesis.currency)}</p>
                            </div>
                            <div className="border p-4 rounded-lg bg-white shadow-sm">
                                <p className="text-xs text-slate-500 font-semibold uppercase">Opex Mensal</p>
                                <p className="text-2xl font-bold text-slate-900">{formatCurrencyState(thesis.opex_monthly, thesis.currency)}</p>
                            </div>
                        </div>

                        <Button onClick={() => setIsEditing(true)} className="w-full border-slate-300 py-6" variant="outline">
                            <Edit2 className="w-4 h-4 mr-2" /> 
                            {isIncomplete ? "Preencher Dados de Pesquisa" : "Editar Dados"}
                        </Button>

                        <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                            <Button onClick={handleDelete} disabled={loading} variant="ghost" className="w-full text-red-500 hover:text-red-700 hover:bg-red-50">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4 mr-2" /> Excluir Tese Permanentemente</>}
                            </Button>
                        </div>
                    </div>
                ) : (
                    // MODO EDIÇÃO (Aqui você preenche os números depois)
                    <form onSubmit={handleUpdate} className="space-y-5 px-1 pb-8">
                        <div className="space-y-2">
                            <Label>Título do Projeto</Label>
                            <Input name="title" defaultValue={thesis.title} className="font-bold" required />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tempo (ex: 8)</Label>
                                <Input name="expected_time" defaultValue={thesis.expected_time} />
                            </div>
                            <div className="space-y-2">
                                <Label>Moeda</Label>
                                <Select name="currency" defaultValue={thesis.currency || 'USD'}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="BRL">BRL (R$)</SelectItem>
                                        <SelectItem value="USD">USD ($)</SelectItem>
                                        <SelectItem value="EUR">EUR (€)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Estudo de Viabilidade</Label>
                            <Textarea name="description" defaultValue={thesis.description} rows={8} className="text-sm leading-relaxed" />
                        </div>

                        {/* FINANCEIRO E RISCO - AGORA VOCÊ PREENCHE AQUI */}
                        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border">
                            <div className="col-span-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                Parâmetros de Pesquisa
                            </div>
                            <div className="space-y-2">
                                <Label>Capex</Label>
                                <Input name="capex" type="number" defaultValue={thesis.capex_setup} />
                            </div>
                            <div className="space-y-2">
                                <Label>Opex Mensal</Label>
                                <Input name="opex" type="number" defaultValue={thesis.opex_monthly} />
                            </div>
                            <div className="space-y-2">
                                <Label>Risco Legal (0-5)</Label>
                                <Input name="risk_legal" type="number" min="0" max="5" defaultValue={thesis.risk_legal} />
                                <p className="text-[10px] text-slate-400">0 = Não avaliado</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Risco Tec (0-5)</Label>
                                <Input name="risk_tech" type="number" min="0" max="5" defaultValue={thesis.risk_tech} />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t mt-4">
                            <Button type="button" variant="ghost" onClick={() => setIsEditing(false)} className="flex-1">Cancelar</Button>
                            <Button type="submit" disabled={loading} className="flex-1 bg-slate-900 text-white">
                                {loading ? "Salvando..." : <><Save className="w-4 h-4 mr-2" /> Salvar Pesquisa</>}
                            </Button>
                        </div>
                    </form>
                )}
            </SheetContent>
        </Sheet>
    )
}