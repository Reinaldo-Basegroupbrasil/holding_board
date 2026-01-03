import { createClient } from '@supabase/supabase-js'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge" // <--- AQUI ESTAVA FALTANDO!
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, Cpu, Briefcase, Zap } from 'lucide-react'

// SEUS COMPONENTES
import { ProviderSettings } from "@/components/capacity/provider-settings" 
import { ProviderModal } from "@/components/capacity/new-provider-btn" 
import { AddDemandBtn } from "@/components/capacity/add-demand-btn" 
import { DemandCard } from "@/components/capacity/demand-card" 

// IMPORTA O NOVO ENVELOPE DE SEGURANÇA
import { AdminOnly } from "@/components/admin-only" 

export const dynamic = 'force-dynamic'
export const revalidate = 0

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function CapacityPage() {
  const { data: providers } = await supabase.from('providers').select('*').order('name')
  
  const { data: activeProjects } = await supabase
    .from('projects')
    .select(`
        id, 
        name, 
        provider_id, 
        status, 
        next_milestone, 
        milestone_date, 
        custom_timeline, 
        parent_project_id,
        companies ( name )
    `)
    .neq('status', 'COMPLETED')
    .not('provider_id', 'is', null)
  
  const { data: companies } = await supabase.from('companies').select('id, name').order('name')

  const renderCard = (provider: any) => {
    const allocations = activeProjects?.filter((p: any) => p.provider_id === provider.id) || []
    const occupied = allocations.length
    const total = provider.capacity_slots || 0
    const isInternal = provider.type === 'INTERNAL_SQUAD'
    
    let percentage = 0
    if (isInternal && total > 0) percentage = Math.min((occupied / total) * 100, 100)
    
    let progressColor = "bg-emerald-500"
    if (percentage > 80) progressColor = "bg-amber-500"
    if (occupied > total) progressColor = "bg-red-500"

    return (
        <Card key={provider.id} className="border-none shadow-sm bg-white overflow-hidden flex flex-col group hover:shadow-md transition-all">
            <CardHeader className="pb-2 border-b border-slate-50 relative">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                            {isInternal ? <Cpu className="w-4 h-4 text-indigo-500" /> : <Briefcase className="w-4 h-4 text-slate-400" />}
                            {provider.name}
                        </CardTitle>
                        <CardDescription className="text-xs font-medium">
                            {isInternal ? `Engine Interna • ${total} Slots` : "Parceiro Externo • Flexível"}
                        </CardDescription>
                    </div>
                    
                    <AdminOnly>
                        <ProviderSettings provider={provider} />
                    </AdminOnly>

                </div>
            </CardHeader>
            
            <CardContent className="pt-4 flex-1 flex flex-col justify-between space-y-4">
                
                <div className="w-full">
                    <AdminOnly>
                        <AddDemandBtn 
                            providerId={provider.id} 
                            providerName={provider.name} 
                            isInternal={isInternal}
                            companies={companies || []}
                        />
                    </AdminOnly>
                </div>

                <div className="space-y-2 min-h-[60px]">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex justify-between">
                        <span>Ocupação Atual</span>
                        <span className={occupied > total && isInternal ? "text-red-500" : ""}>{occupied} Projetos</span>
                    </p>
                    
                    <div className="flex flex-col gap-2">
                        {allocations.slice(0, 5).map((proj: any) => (
                            <DemandCard key={proj.id} project={proj} />
                        ))}
                        
                        {allocations.length === 0 && (
                            <div className="text-center py-4 border-2 border-dashed border-slate-100 rounded-lg">
                                <span className="text-xs text-slate-300 italic">Ocioso / Disponível</span>
                            </div>
                        )}
                        
                        {allocations.length > 5 && (
                            <div className="text-center pt-2">
                                <Badge variant="outline" className="text-[10px]">Ver mais +{allocations.length - 5}</Badge>
                            </div>
                        )}
                    </div>
                </div>

                {isInternal ? (
                    <div className="space-y-1 pt-2 border-t border-slate-50">
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full ${progressColor} transition-all duration-500`} style={{ width: `${percentage}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 pt-1">
                            <span>0%</span>
                            <span>{Math.round(percentage)}% Ocupado</span>
                            <span>100%</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-100 mt-auto">
                        <Zap className="w-3 h-3 text-amber-500" />
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Sob Demanda</span>
                    </div>
                )}
            </CardContent>
        </Card>
    )
  }

  const internalSquads = providers?.filter((p: any) => p.type === 'INTERNAL_SQUAD') || []
  const externalPartners = providers?.filter((p: any) => p.type === 'EXTERNAL_PARTNER') || []

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen text-slate-900">
      
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-800 tracking-tighter">
            <Cpu className="w-8 h-8 text-rose-600" />
            Gestão de Capacidade
          </h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">
            Monitoramento de carga das Squads Internas e Parceiros.
          </p>
        </div>
        
        <AdminOnly>
            <ProviderModal />
        </AdminOnly>

      </div>

      <Tabs defaultValue="internal" className="w-full">
        <div className="flex justify-between items-center mb-6">
            <TabsList className="bg-white border p-1 h-10 shadow-sm">
                <TabsTrigger value="internal" className="flex items-center gap-2 text-xs font-bold px-4 data-[state=active]:bg-slate-100">
                    <Cpu className="w-3.5 h-3.5" /> Parceiros Internos ({internalSquads.length})
                </TabsTrigger>
                <TabsTrigger value="external" className="flex items-center gap-2 text-xs font-bold px-4 data-[state=active]:bg-slate-100">
                    <Briefcase className="w-3.5 h-3.5" /> Parceiros Externos ({externalPartners.length})
                </TabsTrigger>
            </TabsList>
        </div>

        <TabsContent value="internal" className="mt-0">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {internalSquads.length > 0 ? internalSquads.map(renderCard) : (
                    <div className="col-span-3 text-center py-12 text-slate-400 text-sm border-2 border-dashed rounded-xl">
                        Nenhuma Squad Interna cadastrada.
                    </div>
                )}
            </div>
        </TabsContent>

        <TabsContent value="external" className="mt-0">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {externalPartners.length > 0 ? externalPartners.map(renderCard) : (
                    <div className="col-span-3 text-center py-12 text-slate-400 text-sm border-2 border-dashed rounded-xl">
                        Nenhum Parceiro Externo cadastrado.
                    </div>
                )}
            </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}