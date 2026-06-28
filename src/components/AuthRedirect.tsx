'use client'

import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

export default function AuthRedirect() {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      console.log('🔄 Client-side redirect: authenticated user detected, redirecting to workspace')
      router.replace('/workspace')
    }
  }, [isLoaded, isSignedIn, router])

  return null
}
