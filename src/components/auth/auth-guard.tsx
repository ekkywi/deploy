'use client'

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/useAuthStore"
import { Loader2 } from "lucide-react"

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter ()
    const { fetchUser, isLoading, isAuthenticated } = useAuthStore()

    useEffect(() => {
        fetchUser()
    }, [fetchUser])

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.replace('/login')
        }
    }, [isLoading, isAuthenticated, router])

    if (isLoading) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-background">
                <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
                <p className="mt-4 text-sm text-muted-foreground animate-pulse">
                    Securing sessions... 
                </p>
            </div>
        )
    }

    if (!isAuthenticated) {
        return null
    }

    return <>{children}</>
}