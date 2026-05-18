import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Runs daily at 08:00 EAT via pg_cron
serve(async (_req: Request) => {
  const today = new Date()
  const in30Days = new Date(today)
  in30Days.setDate(in30Days.getDate() + 30)
  const in90Days = new Date(today)
  in90Days.setDate(in90Days.getDate() + 90)

  // Fetch employees with contracts expiring within 90 days
  const { data: employees, error } = await supabase
    .from('employee_profiles')
    .select(`
      id, end_date, job_title,
      user:users!inner(full_name, email),
      company:companies!inner(name)
    `)
    .not('end_date', 'is', null)
    .gte('end_date', today.toISOString().split('T')[0])
    .lte('end_date', in90Days.toISOString().split('T')[0])
    .eq('is_deleted', false)

  if (error) {
    console.error('Contract expiry cron error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  let sent = 0
  for (const emp of employees ?? []) {
    const daysLeft = Math.ceil(
      (new Date(emp.end_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )
    const urgency = daysLeft <= 30 ? 'URGENT: ' : ''
    const subject = `${urgency}Contract Expiry Reminder — ${emp.user.full_name}`
    const html = `
      <p>Dear HR Team,</p>
      <p><strong>${emp.user.full_name}</strong>'s contract as <em>${emp.job_title}</em> at
      <strong>${emp.company.name}</strong> expires in <strong>${daysLeft} days</strong>
      (${emp.end_date}).</p>
      <p>Please take the necessary action to renew or conclude their contract.</p>
      <p>— Sheer Logic HR System</p>
    `

    await supabase.functions.invoke('send-email', {
      body: { to: emp.user.email, subject, html, type: 'contract_expiry' },
    })
    sent++
  }

  return new Response(JSON.stringify({ processed: employees?.length ?? 0, sent }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
