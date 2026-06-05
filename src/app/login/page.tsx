'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { loginSchema, type LoginFormData } from '@/lib/validations/auth'

import { AuthShell } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)

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

      toast.success('Login success, loading session...')
      router.push('/dashboard')
      router.refresh()
    } catch (error) {
      console.error('Login error:', error)
      toast.error('A network error occurred. Check your connection.')
    }
  }

  const isSubmitting = form.formState.isSubmitting

  return (
    <AuthShell>
      <Card className="border-primary/15 shadow-md ring-primary/10">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-semibold text-primary">Login</CardTitle>
          <CardDescription>
            Use corporate email to access the dashboard
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail
                          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-primary/70"
                          aria-hidden
                        />
                        <Input
                          placeholder="admin@office.internal"
                          type="email"
                          autoComplete="email"
                          className="h-10 pl-9"
                          {...field}
                        />
                      </div>
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
                      <div className="relative">
                        <Lock
                          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-primary/70"
                          aria-hidden
                        />
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          autoComplete="current-password"
                          className="h-10 pr-10 pl-9"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-0.5 text-primary/60 transition-colors hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? (
                            <EyeOff className="size-4" aria-hidden />
                          ) : (
                            <Eye className="size-4" aria-hidden />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                size="lg"
                className={cn('mt-2 w-full')}
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden />
                    Verifying...
                  </>
                ) : (
                  'Enter System'
                )}
              </Button>
            </form>
          </Form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have access yet?{' '}
            <a
              href="/register"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Apply for account creation
            </a>
          </p>
        </CardContent>
      </Card>
    </AuthShell>
  )
}
