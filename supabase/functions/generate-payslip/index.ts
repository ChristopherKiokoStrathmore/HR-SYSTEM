import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Returns payslip data as JSON for client-side PDF generation
serve(async (req: Request) => {
  const { payroll_record_id } = await req.json()
  if (!payroll_record_id) {
    return new Response(JSON.stringify({ error: 'payroll_record_id required' }), { status: 400 })
  }

  const { data, error } = await supabase
    .from('payroll_records')
    .select(`
      *,
      employee:employee_profiles!inner(
        employee_number, job_title, department, start_date,
        user:users!inner(full_name, email)
      ),
      payroll_run:payroll_runs!inner(
        period_month, period_year,
        company:companies!inner(name, contact_email)
      )
    `)
    .eq('id', payroll_record_id)
    .single()

  if (error || !data) {
    return new Response(JSON.stringify({ error: error?.message ?? 'Not found' }), { status: 404 })
  }

  return new Response(JSON.stringify({ data }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
