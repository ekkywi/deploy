'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function AutoRefresh({ isActive, interval = 3000 }: { isActive: boolean, interval?: number }) {
    const router = useRouter()

    useEffect(() => {
        if (!isActive) return
        
        const timer = setInterval(() => {
            router.refresh()
        }, interval)

        return() => clearInterval(timer)
    }, [isActive, interval, router])

    return null
};