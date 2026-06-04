'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { loginSchema, type LoginFormData } from '@/lib/validations/auth'

// Impor komponen shadcn/ui
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const router = useRouter()

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Authentication failed. Invalid credentials')
        return
      }

      toast.success('Login success, load session')
      router.push('/dashboard')
      router.refresh() 
      
    } catch (error) {
      console.error('Login error:', error)
      toast.error('A network error occurred. Check your connection.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-sm border border-zinc-200">
        
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Control Plane</h2>
          <p className="mt-2 text-sm text-zinc-600">Authenticate with your system credentials</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-8">
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input placeholder="admin@office.internal" type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full" 
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? 'Verifying...' : 'Sign In'}
            </Button>
            
          </form>
        </Form>
        
      </div>
    </div>
  )
}