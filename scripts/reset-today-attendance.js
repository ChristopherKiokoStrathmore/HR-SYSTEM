/**
 * Deletes all attendance records for today (EAT timezone)
 * so employees can test a fresh check-in via the PWA.
 *
 * Usage:  node scripts/reset-today-attendance.js
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' })
  console.log(`Deleting attendance records for shift_date = ${today} …`)

  const { data, error } = await supabase
    .from('attendance')
    .delete()
    .eq('shift_date', today)
    .select('id, employee_id, check_in_time, check_out_time')

  if (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }

  console.log(`Deleted ${data?.length ?? 0} record(s):`)
  data?.forEach(r => {
    console.log(`  id=${r.id}  emp=${r.employee_id}  in=${r.check_in_time}  out=${r.check_out_time}`)
  })
  console.log('Done. Employees can now check in fresh via the PWA.')
}

main()
