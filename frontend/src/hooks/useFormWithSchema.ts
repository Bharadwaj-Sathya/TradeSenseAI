// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { useForm, type UseFormReturn, type DefaultValues } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ZodType, ZodTypeAny } from 'zod'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useFormWithSchema<T extends Record<string, any>>(
  schema: ZodType<T> | ZodTypeAny,
  defaultValues?: DefaultValues<T>
): UseFormReturn<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return useForm<T>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any) as any,
    defaultValues,
  })
}
