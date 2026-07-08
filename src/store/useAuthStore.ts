import { create } from 'zustand'

export interface User {
    id: string
    email: string
    firstName: string
    lastName: string | null
    role: 'SYSADMIN' | 'MANAGER' | 'DEVELOPER'
    status: 'PENDING' | 'ACTIVE' | 'SUSPENDED'
}

interface AuthState {
    user: User | null
    isLoading: boolean
    isAuthenticated: boolean
    fetchUser: () => Promise<void>
    logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isLoading: true,
    isAuthenticated: false,

    fetchUser: async () => {
        try {
            const response = await fetch('/api/auth/me', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json'},
            })

            if (!response.ok) {
                throw new Error('Invalid or expired session.')
            }

            const data = await response.json()

            set({
                user: data.user,
                isAuthenticated: true,
                isLoading: false
            })
        } catch {
            set({
                user: null,
                isAuthenticated: false,
                isLoading: false
            })
        }
    },

    logout: async () => {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST'
            })

            set ({
                user: null,
                isAuthenticated: false
            })

            window.location.href = '/login'
        } catch (error) {
            console.error('Logout failed:', error)
        }
    }
}))
