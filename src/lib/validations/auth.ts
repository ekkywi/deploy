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
    firstName: z.string().min(1, 'First name is required').max(50),
    lastName: z.string() .optional(),
    email: z.string().min(1, 'Email is required').email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password')
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
})

export type RegisterFormData = z.infer<typeof registerSchema>

export const profileUpdateSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required').max(50),
    lastName: z.string().max(50).optional().nullable(),
    email: z.string().min(1, 'Email is required').email('Invalid email format'),
    currentPassword: z.string().optional(),
    newPassword: z.string().optional(),
    confirmNewPassword: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const wantsPasswordChange = Boolean(
      data.currentPassword || data.newPassword || data.confirmNewPassword
    )

    if (!wantsPasswordChange) {
      return
    }

    if (!data.currentPassword) {
      ctx.addIssue({
        code: 'custom',
        path: ['currentPassword'],
        message: 'Current password is required to change password.',
      })
    }

    if (!data.newPassword || data.newPassword.length < 8) {
      ctx.addIssue({
        code: 'custom',
        path: ['newPassword'],
        message: 'New password must be at least 8 characters.',
      })
    }

    if (data.newPassword !== data.confirmNewPassword) {
      ctx.addIssue({
        code: 'custom',
        path: ['confirmNewPassword'],
        message: 'New passwords do not match.',
      })
    }
  })

export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>
