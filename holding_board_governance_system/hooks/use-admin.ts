import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"

export function useAdmin() {
  const [role, setRole] = useState<string | null>(null)
  const [providerId, setProviderId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
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
          .select('role, provider_id')
          .eq('id', user.id)
          .single()
        
        setRole(data?.role || 'partner')
        setProviderId(data?.provider_id || null)
      }
      
      setLoading(false)
    }

    getProfile()
  }, [supabase])

  return {
    role,
    isAdmin: role === 'admin',
    isManager: role === 'manager' || role === 'admin',
    isPartner: role === 'partner',
    providerId,
    userEmail,
    loading
  }
}