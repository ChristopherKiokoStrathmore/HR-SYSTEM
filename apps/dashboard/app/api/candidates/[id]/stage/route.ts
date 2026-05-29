export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'
import type { CandidateStage } from '@hr/shared'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supabase = createServerClient(true)
  const { stage, notes, forceHire } = (await req.json()) as {
    stage: CandidateStage
    notes?: string
    forceHire?: boolean  // Allow bypassing background check warning (not block)
  }

  // If transitioning to 'hired', check background check requirements
  if (stage === 'hired') {
    // Call the database function to check if hiring is allowed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: canHireResult, error: checkError } = await (supabase.rpc as any)('can_hire_candidate', {
      p_candidate_id: id,
    })

    if (checkError) {
      console.error('Background check gate error:', checkError)
      // Don't block on error, just log it
    } else if (canHireResult) {
      const result = canHireResult as {
        can_hire: boolean
        warning?: boolean
        reason: string
        pending_checks?: number
      }

      // Hard block: company requires background check and blocks hiring
      if (!result.can_hire) {
        return NextResponse.json({
          error: 'Cannot hire candidate',
          reason: result.reason,
          pending_checks: result.pending_checks,
          blocked: true,
          message: 'Background check required before hiring. Please complete background checks first.',
        }, { status: 403 })
      }

      // Soft warning: background check incomplete but not blocking
      if (result.warning && !forceHire) {
        return NextResponse.json({
          error: 'Background check incomplete',
          reason: result.reason,
          pending_checks: result.pending_checks,
          warning: true,
          message: 'Background check is incomplete. Set forceHire=true to proceed anyway.',
        }, { status: 400 })
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('candidates') as any)
    .update({
      current_stage: stage,
      ...(notes !== undefined ? { notes } : {}),
      ...(stage === 'rejected' ? { rejection_reason: notes ?? 'Manually rejected' } : {}),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If we moved the candidate to 'hired', ensure onboarding by creating
  // an auth user + `users` row and an `employee_profiles` row (idempotent).
  if (stage === 'hired') {
    try {
      // Fetch candidate with job posting to find company
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: candRaw } = await (supabase.from('candidates') as any)
        .select('*, job_posting:job_postings(company_id, title)')
        .eq('id', id)
        .single()

      const candidate = candRaw as { email: string; full_name: string; tenant_id: string; job_posting?: { company_id?: string; title?: string } }
      const email = candidate?.email
      const fullName = candidate?.full_name ?? 'New Hire'
      const companyId = candidate?.job_posting?.company_id ?? candidate?.tenant_id

      if (email && companyId) {
        // 1) Ensure users row exists, create invite if needed
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: existingUser } = await (supabase.from('users') as any)
          .select('id')
          .eq('email', email)
          .maybeSingle()

        let userId: string | undefined = existingUser?.id

        if (!userId) {
          // Invite via Supabase Auth admin API
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: inviteData, error: inviteErr } = await (supabase.auth.admin as any).inviteUserByEmail(email, {
            data: { full_name: fullName, role: 'employee' },
          })

          if (!inviteErr && inviteData?.user?.id) {
            userId = inviteData.user.id

            // Insert users row (idempotent guard later)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from('users') as any).insert({
              id: userId,
              full_name: fullName,
              email,
              role: 'employee',
              company_id: companyId,
              preferred_language: 'en',
              is_active: true,
              tenant_id: companyId,
            })
          } else {
            console.warn('Invite user error (may already exist):', inviteErr)
          }
        }

        // 2) Ensure employee_profiles exists for user
        if (userId) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: existingProfile } = await (supabase.from('employee_profiles') as any)
            .select('id')
            .eq('user_id', userId)
            .maybeSingle()

          if (!existingProfile) {
            // Generate a simple employee number
            const empNumber = `EMP-${Date.now().toString().slice(-6)}`
            const jobTitle = candidate?.job_posting?.title ?? 'New Hire'
            const today = new Date().toISOString().slice(0, 10)

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: profileData, error: profileErr } = await (supabase.from('employee_profiles') as any)
              .insert({
                tenant_id: companyId,
                user_id: userId,
                employee_number: empNumber,
                company_id: companyId,
                department: null,
                job_title: jobTitle,
                employment_type: 'white_collar',
                employment_status: 'active',
                manager_id: null,
                start_date: today,
                end_date: null,
                contract_duration_months: null,
                salary: 0,
                payment_method: 'bank',
              })
              .select()
              .single()

            if (profileErr) {
              console.error('Failed to create employee_profile for hired candidate:', profileErr)
            } else if (profileData?.id) {
              // 3) Seed leave balances for the new employee (current year)
              const year = new Date().getFullYear()
              const leaveTypes = ['annual', 'sick', 'maternity', 'paternity', 'study', 'compassionate', 'unpaid'] as const
              const defaultDays: Record<string, number> = {
                annual: 21, sick: 14, maternity: 90, paternity: 14,
                study: 10, compassionate: 5, unpaid: 30,
              }

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (supabase.from('leave_balances') as any).insert(
                leaveTypes.map((t) => ({
                  employee_id: profileData.id,
                  leave_type: t,
                  year,
                  total_days: defaultDays[t],
                  used_days: 0,
                  remaining_days: defaultDays[t],
                  tenant_id: companyId,
                }))
              )
            }
          }
        }
      }
    } catch (e) {
      console.error('Error during hired -> onboarding creation:', e)
      // do not fail the stage update for non-critical creation errors
    }
  }

  return NextResponse.json({ data })
}
