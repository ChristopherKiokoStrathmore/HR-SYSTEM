export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'
import { checkRateLimit } from '@/lib/rate-limit'
import { getSessionUserId } from '@/lib/get-session-user'

/**
 * POST /api/payroll/disburse
 *
 * Initiates payroll disbursement via PesaPal.
 * Creates payment batches and submits to the PesaPal edge function.
 *
 * Body: { runId: string, method?: 'bank' | 'mpesa' | 'airtel' | 'all' }
 *
 * If method is 'all' or not specified, creates separate batches for each payment method.
 */
export async function POST(req: NextRequest) {
  const limited = await checkRateLimit(req, 'moderate')
  if (limited) return limited

  try {
    const supabase = createServerClient(true)
    const body = await req.json()
    const { runId, method = 'all' } = body as {
      runId: string
      method?: 'bank' | 'mpesa' | 'airtel' | 'all'
    }

    if (!runId) {
      return NextResponse.json({ error: 'runId required' }, { status: 400 })
    }

    // Get session user for audit
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the payroll run
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: run, error: runError } = await (supabase.from('payroll_runs') as any)
      .select('id, company_id, status, tenant_id')
      .eq('id', runId)
      .single()

    if (runError || !run) {
      return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 })
    }

    if (run.status === 'completed') {
      return NextResponse.json({ error: 'Payroll run already completed' }, { status: 400 })
    }

    // Get all pending payroll records with employee details
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: records, error: recordsError } = await (supabase.from('payroll_records') as any)
      .select(`
        id,
        employee_id,
        net_salary,
        payment_method,
        payment_status,
        employee:employee_profiles(
          id,
          mpesa_number,
          airtel_number,
          bank_account,
          bank_name,
          user:users(full_name, email, phone)
        )
      `)
      .eq('payroll_run_id', runId)
      .eq('payment_status', 'pending')
      .eq('is_deleted', false)

    if (recordsError) {
      return NextResponse.json({ error: recordsError.message }, { status: 500 })
    }

    if (!records || records.length === 0) {
      return NextResponse.json({ error: 'No pending payments found' }, { status: 400 })
    }

    // Filter records by method if specified
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filteredRecords = method === 'all'
      ? records
      : records.filter((r: any) => r.payment_method === method)

    if (filteredRecords.length === 0) {
      return NextResponse.json({ error: `No pending ${method} payments found` }, { status: 400 })
    }

    // Group records by payment method
    const recordsByMethod: Record<string, typeof filteredRecords> = {}
    for (const record of filteredRecords) {
      const m = record.payment_method
      if (!recordsByMethod[m]) recordsByMethod[m] = []
      recordsByMethod[m].push(record)
    }

    // Create payment batches for each method
    const batches: Array<{
      id: string
      method: string
      records: typeof filteredRecords
    }> = []

    for (const [paymentMethod, methodRecords] of Object.entries(recordsByMethod)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalAmount = methodRecords.reduce((sum: number, r: any) => sum + r.net_salary, 0)

      // Create the batch
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: batch, error: batchError } = await (supabase.from('payment_batches') as any)
        .insert({
          payroll_run_id: runId,
          payment_method: paymentMethod,
          status: 'pending',
          total_amount: totalAmount,
          total_records: methodRecords.length,
          initiated_by: userId,
          initiated_at: new Date().toISOString(),
          tenant_id: run.tenant_id,
        })
        .select()
        .single()

      if (batchError) {
        console.error('Batch creation error:', batchError)
        continue
      }

      // Link records to the batch
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recordIds = methodRecords.map((r: any) => r.id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('payroll_records') as any)
        .update({ payment_batch_id: batch.id })
        .in('id', recordIds)

      batches.push({
        id: batch.id,
        method: paymentMethod,
        records: methodRecords,
      })
    }

    if (batches.length === 0) {
      return NextResponse.json({ error: 'Failed to create payment batches' }, { status: 500 })
    }

    // Process each batch via the PesaPal edge function
    const results: Array<{
      batch_id: string
      method: string
      success: boolean
      processed?: number
      demo?: boolean
      error?: string
    }> = []

    for (const batch of batches) {
      try {
        // Prepare records for the edge function
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const disburseRecords = batch.records.map((r: any) => {
          const emp = r.employee as {
            id: string
            mpesa_number?: string
            airtel_number?: string
            bank_account?: string
            bank_name?: string
            user?: { full_name: string; email: string; phone?: string }
          }

          return {
            id: r.id,
            employee_name: emp?.user?.full_name || 'Unknown',
            email: emp?.user?.email || '',
            phone: batch.method === 'mpesa'
              ? emp?.mpesa_number
              : batch.method === 'airtel'
                ? emp?.airtel_number
                : emp?.user?.phone,
            net_salary: r.net_salary,
            payment_method: r.payment_method,
          }
        })

        // Call the PesaPal edge function
        const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/pesapal-disburse`

        const response = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            batch_id: batch.id,
            payroll_run_id: runId,
            records: disburseRecords,
          }),
        })

        const result = await response.json()

        if (response.ok) {
          results.push({
            batch_id: batch.id,
            method: batch.method,
            success: true,
            processed: result.processed,
            demo: result.demo,
          })
        } else {
          results.push({
            batch_id: batch.id,
            method: batch.method,
            success: false,
            error: result.error,
          })
        }
      } catch (err) {
        console.error(`Batch ${batch.id} processing error:`, err)
        results.push({
          batch_id: batch.id,
          method: batch.method,
          success: false,
          error: String(err),
        })
      }
    }

    // Check if all batches succeeded
    const allSuccess = results.every(r => r.success)
    const anySuccess = results.some(r => r.success)
    const isDemo = results.some(r => r.demo)

    // Get updated run status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedRun } = await (supabase.from('payroll_runs') as any)
      .select('*')
      .eq('id', runId)
      .single()

    return NextResponse.json({
      success: anySuccess,
      data: updatedRun,
      batches: results,
      totalProcessed: results.filter(r => r.success).reduce((sum, r) => sum + (r.processed || 0), 0),
      demo: isDemo,
      reference: `SL-${Date.now()}`,
    }, {
      headers: isDemo ? { 'X-Demo-Mode': 'true' } : {},
    })
  } catch (err) {
    console.error('Disbursement error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
