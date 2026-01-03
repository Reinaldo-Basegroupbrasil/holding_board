import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ShieldCheck, Users, Bell, Lock, Settings } from 'lucide-react'

// IMPORTANDO OS COMPONENTES QUE CRIAMOS
import { AdminOnly } from "@/components/admin-only" 
import { AuditLogs } from "@/components/admin/audit-logs"
import { TeamManagement } from "@/components/admin/team-management"
import { NotificationSettings } from "@/components/admin/notification-settings"
import { SecurityTab } from "@/components/admin/security-tab"
import { SystemSettings } from "@/components/admin/system-settings"

export default function AdminPage() {
  return (
    <AdminOnly>
        <div className="p-8 space-y-8 bg-slate-50 min-h-screen text-slate-900">
        
        <div className="flex justify-between items-end">
            <div>
            <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-800 tracking-tighter">
                <ShieldCheck className="w-8 h-8 text-rose-600" />
                Administração & Governança
            </h1>
            <p className="text-slate-500 mt-1 text-sm font-medium">
                Centro de controle de acessos, segurança e auditoria global.
            </p>
            </div>
        </div>

        <Tabs defaultValue="audit" className="w-full">
            <div className="flex justify-between items-center mb-6">
                <TabsList className="bg-white border p-1 h-10 shadow-sm w-full md:w-auto grid grid-cols-5 md:flex">
                    <TabsTrigger value="audit" className="gap-2 text-xs font-bold px-4 data-[state=active]:bg-slate-100"><ShieldCheck className="w-3.5 h-3.5" /> <span className="hidden md:inline">Auditoria</span></TabsTrigger>
                    <TabsTrigger value="team" className="gap-2 text-xs font-bold px-4 data-[state=active]:bg-slate-100"><Users className="w-3.5 h-3.5" /> <span className="hidden md:inline">Time</span></TabsTrigger>
                    <TabsTrigger value="notify" className="gap-2 text-xs font-bold px-4 data-[state=active]:bg-slate-100"><Bell className="w-3.5 h-3.5" /> <span className="hidden md:inline">Notificações</span></TabsTrigger>
                    <TabsTrigger value="security" className="gap-2 text-xs font-bold px-4 data-[state=active]:bg-slate-100"><Lock className="w-3.5 h-3.5" /> <span className="hidden md:inline">Segurança</span></TabsTrigger>
                    <TabsTrigger value="config" className="gap-2 text-xs font-bold px-4 data-[state=active]:bg-slate-100"><Settings className="w-3.5 h-3.5" /> <span className="hidden md:inline">Configurações</span></TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="audit" className="mt-0">
                <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
                        <h3 className="text-sm font-bold text-blue-800 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Rastro de Auditoria (Immutable Logs)</h3>
                        <p className="text-xs text-blue-600 mt-1">Registro de todas as ações críticas (Criação, Edição, Exclusão) realizadas no sistema.</p>
                    </div>
                    <AuditLogs />
                </div>
            </TabsContent>

            <TabsContent value="team" className="mt-0">
                <TeamManagement />
            </TabsContent>

            <TabsContent value="notify" className="mt-0">
                <NotificationSettings />
            </TabsContent>

            <TabsContent value="security" className="mt-0">
                <SecurityTab />
            </TabsContent>

            <TabsContent value="config" className="mt-0">
                <SystemSettings />
            </TabsContent>
        </Tabs>
        </div>
    </AdminOnly>
  )
}