'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada no servidor')
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

export async function createUserAction(payload: {
  email: string
  password: string
  role: string
  providerId?: string | null
}) {
  try {
    const supabase = getAdminClient()

    const { data, error } = await supabase.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true,
    })

    if (error) throw error
    if (!data.user) throw new Error('Usuário não foi criado')

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: data.user.id,
        email: payload.email,
        role: payload.role,
        provider_id: payload.providerId || null,
      })

    if (profileError) throw profileError

    revalidatePath('/admin')
    return { success: true, userId: data.user.id }
  } catch (e: any) {
    console.error('Erro ao criar usuário:', e.message)
    return { success: false, error: e.message }
  }
}
