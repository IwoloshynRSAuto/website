/**
 * Standardized form hook with React Hook Form + Zod validation
 * Provides consistent form architecture across the application
 */

'use client'

import { useForm, UseFormReturn, FieldValues, Path } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { toast } from 'react-hot-toast'

export interface UseFormWithValidationOptions<T extends FieldValues> {
  schema: z.ZodSchema<T>
  defaultValues?: Partial<T>
  onSubmit: (data: T) => Promise<void> | void
  onSuccess?: () => void
  successMessage?: string
  errorMessage?: string
}

export function useFormWithValidation<T extends FieldValues>({
  schema,
  defaultValues,
  onSubmit,
  onSuccess,
  successMessage = 'Form submitted successfully',
  errorMessage = 'Failed to submit form',
}: UseFormWithValidationOptions<T>) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as T,
  })

  const handleSubmit = async (data: T) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
      toast.success(successMessage)
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error('Form submission error:', error)
      toast.error(error.message || errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    ...form,
    handleSubmit: form.handleSubmit(handleSubmit),
    isSubmitting,
  }
}

/**
 * Helper to get field error message
 */
export function getFieldError<T extends FieldValues>(
  form: UseFormReturn<T>,
  fieldName: Path<T>
): string | undefined {
  const error = form.formState.errors[fieldName]
  return error?.message as string | undefined
}

/**
 * Helper to check if field has error
 */
export function hasFieldError<T extends FieldValues>(
  form: UseFormReturn<T>,
  fieldName: Path<T>
): boolean {
  return !!form.formState.errors[fieldName]
}

