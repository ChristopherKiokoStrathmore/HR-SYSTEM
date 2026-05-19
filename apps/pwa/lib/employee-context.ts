import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@hr/shared'

type AuthUser = {
  id: string
  email?: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function resolvePwaUserRecord(service: SupabaseClient<Database>, authUser: AuthUser | null | undefined): Promise<Record<string, any> | null> {
  const fallbackEmail = process.env.PWA_EMAIL ?? 'david@demo.co.ke'
  const candidateEmails = new Set<string>()

  if (authUser?.email) candidateEmails.add(authUser.email)
  candidateEmails.add(fallbackEmail)

  if (authUser?.id) {
    const { data: matchedById } = await service
      .from('users' as any)
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle()

    if (matchedById) return matchedById
  }

  for (const email of candidateEmails) {
    const { data: matchedByEmail } = await service
      .from('users' as any)
      .select('*')
      .eq('email', email)
      .eq('is_deleted', false)
      .maybeSingle()

    if (matchedByEmail) return matchedByEmail
  }

  return null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function resolveEmployeeContext(
  service: SupabaseClient<Database>,
  authUser: AuthUser | null | undefined,
): Promise<{ employee: Record<string, any> | null; userId: string | null }> {
  const candidateIds = new Set<string>()

  if (authUser?.id) candidateIds.add(authUser.id)

  const candidateEmails = [authUser?.email, process.env.PWA_EMAIL ?? 'david@demo.co.ke']
    .filter(Boolean) as string[]

  for (const email of candidateEmails) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: matchedUser } = await (service as any)
      .from('users')
      .select('id, email')
      .eq('email', email)
      .eq('is_deleted', false)
      .maybeSingle() as { data: { id: string; email: string } | null }

    if (matchedUser?.id) candidateIds.add(matchedUser.id)
  }

  for (const userId of candidateIds) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: employee } = await (service as any)
      .from('employee_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .maybeSingle() as { data: Record<string, any> | null }

    if (employee) {
      return { employee, userId }
    }
  }

  return { employee: null, userId: authUser?.id ?? null }
}