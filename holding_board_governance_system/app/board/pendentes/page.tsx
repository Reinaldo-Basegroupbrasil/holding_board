import { redirect } from 'next/navigation'
import { createClient, getUserProfile } from '@/lib/supabase-server'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { FileText, Calendar } from 'lucide-react'

export const dynamic = 'force-dynamic'

function normalize(str: string) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

export default async function PendentesPage() {
  const supabase = await createClient()
  const profile = await getUserProfile()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const userEmail = profile?.email || user.email || ''
  const rawName = user.user_metadata?.full_name || userEmail.split('@')[0]
  const userName = rawName.replace('.', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
  const isAdmin = profile?.role === 'admin'

  const { data: providers } = await supabase
    .from('providers')
    .select('id, name, email')
    .order('name', { ascending: true })

  let myProvider: { id: string; name: string; email?: string } | null = null
  if (profile?.providerId) {
    myProvider = providers?.find((p) => p.id === profile.providerId) || null
  }
  if (!myProvider && providers) {
    myProvider = providers.find((p: { email?: string }) => p.email?.toLowerCase() === userEmail.toLowerCase()) || null
  }
  if (!myProvider && providers) {
    const emailKey = normalize(userEmail.split('@')[0])
    myProvider = providers.find((p: { name?: string }) => normalize(p.name || '').includes(emailKey)) || null
  }

  const { data: allPending } = await supabase
    .from('board_tasks')
    .select('id, title, due_date, requestor, provider_id, providers(name)')
    .in('status', ['pendente', 'em_andamento'])
    .order('due_date', { ascending: true, nullsFirst: false })

  const visible = (allPending || []).filter((t: { provider_id?: string; requestor?: string }) => {
    if (isAdmin) return true
    if (myProvider && t.provider_id === myProvider.id) return true
    if (t.requestor === userName) return true
    return false
  })

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-800 mb-1">Pendências em aberto</h1>
        <p className="text-slate-500 text-sm mb-6">
          Suas demandas pendentes ou em andamento. Atualize pelo sistema ou responda no grupo.
        </p>

        {visible.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
            Nenhuma pendência em aberto.
          </div>
        ) : (
          <ul className="space-y-3">
            {visible.map((task: { id: string; title: string; due_date?: string | null; requestor?: string; providers?: { name?: string } }) => (
              <li
                key={task.id}
                className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3 shadow-sm"
              >
                <div className="p-2 bg-slate-100 rounded-lg">
                  <FileText className="w-5 h-5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800">{task.title}</p>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
                    {task.due_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {format(new Date(task.due_date), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    )}
                    <span>Responsável: {task.providers?.name || '-'}</span>
                    {task.requestor && <span>Solicitado por: {task.requestor}</span>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
