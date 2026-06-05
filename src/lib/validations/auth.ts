import { z } from 'zod'

export const loginSchema = z.object({
    email: z.string()
    .min(1, 'Email is required.')
    .email('Invalid email format.'),
    password: z.string()
    .min(1, 'Password is required.')
})

export type LoginFormData = z.infer<typeof loginSchema>

export const registerSchema = z.object({
    firstName: z.string().min(1, 'First name is rquired').max(50),
    lastName: z.string() .optional(),
    email: z.string().min(1, 'Email is required').email('Invalid email format'),
    password: z.string().min(8, 'Password must be at lest 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password')
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Password do not match',
    path: ['ConfirmPassword'],
})

export type RegisterFormData = z.infer<typeof registerSchema>