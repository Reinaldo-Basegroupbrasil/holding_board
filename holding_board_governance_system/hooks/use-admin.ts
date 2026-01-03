"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null) // Adicionado

  // ⚠️ SEU EMAIL DE SUPER ADMIN
  const ADMIN_EMAIL = "reinaldo.goncalves@basegroupbrasil.com"

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user && user.email) {
        setUserEmail(user.email)
        if (user.email.trim().toLowerCase() === ADMIN_EMAIL.trim().toLowerCase()) {
          setIsAdmin(true)
        } else {
          setIsAdmin(false)
        }
      } else {
        setUserEmail(null)
        setIsAdmin(false)
      }
      setLoading(false)
    }

    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkUser()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, ADMIN_EMAIL])

  // AGORA RETORNA O USEREMAIL
  return { isAdmin, loading, userEmail } 
}