import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"

export function useAdmin() {
  const [role, setRole] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function getProfile() {
      // 1. Pega o usuário logado na sessão atual
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        setUserEmail(user.email ?? null)
        
        // 2. Busca o cargo (role) na tabela 'profiles' que você criou no Supabase
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
  }, [supabase])

  // O 'isManager' retorna true se for Manager OU Admin.
  // Isso garante que você (Admin) continue tendo acesso a tudo o que o Armando faz.
  return {
    isAdmin: role === 'admin',
    isManager: role === 'manager' || role === 'admin',
    userEmail,
    loading
  }
}