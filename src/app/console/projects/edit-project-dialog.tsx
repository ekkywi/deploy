'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ProjectWithDetails } from './columns'

const formSchema = z.object({
  name: z.string().min(3, {
    message: 'Project name must be at least 3 characters.',
  }),
  description: z.string().optional(),
  repoUrl: z
    .string()
    .refine((value) => value === '' || isHttpUrl(value), {
      message: 'Please enter a valid URL (http/https).',
    })
    .or(z.literal(''))
    .optional(),
})

type FormValues = z.infer<typeof formSchema>

interface EditProjectDialogProps {
  project: ProjectWithDetails | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (updatedProject: ProjectWithDetails) => void
}

export function EditProjectDialog({
  project,
  open,
  onOpenChange,
  onSuccess,
}: EditProjectDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      repoUrl: '',
    },
  })

  useEffect(() => {
    if (project && open) {
      form.reset({
        name: project.name,
        description: project.description || '',
        repoUrl: project.repoUrl || '',
      })
    }
  }, [project, open, form])

  async function onSubmit(values: FormValues) {
    if (!project) return

    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update project')
      }

      toast.success(data.message)
      
      const updatedProjectUI: ProjectWithDetails = {
        ...project,
        name: data.project.name,
        description: data.project.description,
        repoUrl: data.project.repoUrl,
        updatedAt: data.project.updatedAt,
      }

      onSuccess(updatedProjectUI)
      onOpenChange(false)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to update project')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!project) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Edit Project Metadata</DialogTitle>
          <DialogDescription>
            Make changes to the project details here. Click save when you are done.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. My Awesome App" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Briefly describe what this project is about..." 
                      className="resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="repoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Git Repository URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://github.com/org/repo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}
