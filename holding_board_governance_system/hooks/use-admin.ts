// hooks/use-admin.ts
import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"

export function useAdmin() {
  const [role, setRole] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null) // 🚀 Adicionado
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserEmail(user.email ?? null)
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        
        setRole(data?.role || 'user')
      }
      setLoading(false)
    }
    getProfile()
  }, [])

  return {
    isAdmin: role === 'admin',
    isManager: role === 'manager' || role === 'admin', // 🚀 Resolve o erro da imagem 33d1fd
    userEmail, // 🚀 Necessário para os logs de auditoria
    loading
  }
}