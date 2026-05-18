/**
 * Auto-generated Supabase types.
 * Run `supabase gen types typescript --local > packages/shared/src/supabase/database.types.ts`
 * after applying migrations to regenerate.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          is_deleted: boolean
          tenant_id: string
          name: string
          logo_url: string | null
          industry: string | null
          country: string
          city: string | null
          primary_color: string | null
          contact_email: string
          is_active: boolean
        }
        Insert: Omit<Database['public']['Tables']['companies']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['companies']['Insert']>
      }
      users: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          is_deleted: boolean
          tenant_id: string
          full_name: string
          email: string
          role: 'super_admin' | 'hr_admin' | 'manager' | 'employee'
          company_id: string
          avatar_url: string | null
          phone: string | null
          is_active: boolean
          preferred_language: 'en' | 'sw'
          last_login_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      employee_profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          is_deleted: boolean
          tenant_id: string
          user_id: string
          employee_number: string
          company_id: string
          department: string | null
          job_title: string
          employment_type: 'white_collar' | 'casual'
          employment_status: 'active' | 'on_leave' | 'suspended' | 'terminated' | 'resigned'
          manager_id: string | null
          start_date: string
          end_date: string | null
          contract_duration_months: number | null
          salary: number
          payment_method: 'bank' | 'mpesa' | 'airtel'
          bank_name: string | null
          bank_account: string | null
          mpesa_number: string | null
          airtel_number: string | null
          nssf_number: string | null
          nhif_number: string | null
          kra_pin: string | null
          id_number: string | null
          date_of_birth: string | null
          gender: string | null
          nationality: string | null
          next_of_kin_name: string | null
          next_of_kin_phone: string | null
          next_of_kin_relationship: string | null
        }
        Insert: Omit<Database['public']['Tables']['employee_profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['employee_profiles']['Insert']>
      }
      documents: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          is_deleted: boolean
          tenant_id: string
          employee_id: string
          type: 'id' | 'nssf' | 'nhif' | 'kra' | 'bank_details' | 'photo' | 'contract' | 'medical' | 'pcc' | 'other'
          file_url: string
          status: 'pending' | 'uploaded' | 'verified' | 'rejected'
          rejection_reason: string | null
          expiry_date: string | null
          uploaded_at: string
          verified_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['documents']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['documents']['Insert']>
      }
      job_postings: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          is_deleted: boolean
          tenant_id: string
          company_id: string
          title: string
          department: string | null
          description: string
          required_keywords: string[]
          nice_to_have_keywords: string[]
          employment_type: 'white_collar' | 'casual'
          status: 'open' | 'closed' | 'on_hold'
          auto_reject_threshold: number
          closing_date: string | null
          created_by: string
        }
        Insert: Omit<Database['public']['Tables']['job_postings']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['job_postings']['Insert']>
      }
      candidates: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          is_deleted: boolean
          tenant_id: string
          job_posting_id: string
          full_name: string
          email: string
          phone: string | null
          cv_url: string
          cv_text: string | null
          ai_score: number | null
          ai_summary: string | null
          ai_extracted_skills: string[]
          ai_experience_years: number | null
          ai_education: string | null
          current_stage: 'screened' | 'interview_l1' | 'interview_l2' | 'offer_sent' | 'hired' | 'rejected'
          rejection_reason: string | null
          notes: string | null
        }
        Insert: Omit<Database['public']['Tables']['candidates']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['candidates']['Insert']>
      }
      attendance: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          is_deleted: boolean
          tenant_id: string
          employee_id: string
          company_id: string
          check_in_time: string | null
          check_out_time: string | null
          check_in_lat: number | null
          check_in_lng: number | null
          check_out_lat: number | null
          check_out_lng: number | null
          gps_path: Json | null
          distance_covered_km: number | null
          is_late: boolean
          is_early_departure: boolean
          shift_date: string
          status: 'present' | 'absent' | 'half_day'
        }
        Insert: Omit<Database['public']['Tables']['attendance']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['attendance']['Insert']>
      }
      leaves: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          is_deleted: boolean
          tenant_id: string
          employee_id: string
          company_id: string
          leave_type: 'annual' | 'sick' | 'maternity' | 'paternity' | 'study' | 'compassionate' | 'unpaid' | 'adoption' | 'family'
          start_date: string
          end_date: string
          days_requested: number
          reason: string
          supporting_doc_url: string | null
          status: 'pending' | 'approved' | 'rejected' | 'cancelled'
          approved_by: string | null
          approved_at: string | null
          rejection_reason: string | null
        }
        Insert: Omit<Database['public']['Tables']['leaves']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['leaves']['Insert']>
      }
      leave_balances: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          is_deleted: boolean
          tenant_id: string
          employee_id: string
          leave_type: 'annual' | 'sick' | 'maternity' | 'paternity' | 'study' | 'compassionate' | 'unpaid' | 'adoption' | 'family'
          year: number
          total_days: number
          used_days: number
          remaining_days: number
        }
        Insert: Omit<Database['public']['Tables']['leave_balances']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['leave_balances']['Insert']>
      }
      payroll_runs: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          is_deleted: boolean
          tenant_id: string
          company_id: string
          period_month: number
          period_year: number
          status: 'draft' | 'processing' | 'completed' | 'failed'
          total_gross: number
          total_deductions: number
          total_net: number
          run_by: string
          completed_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['payroll_runs']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['payroll_runs']['Insert']>
      }
      payroll_records: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          is_deleted: boolean
          tenant_id: string
          payroll_run_id: string
          employee_id: string
          gross_salary: number
          paye: number
          nssf: number
          nhif: number
          helb: number
          other_deductions: number
          net_salary: number
          payment_method: 'bank' | 'mpesa' | 'airtel'
          payment_status: 'pending' | 'processing' | 'paid' | 'failed'
          payment_reference: string | null
          paid_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['payroll_records']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['payroll_records']['Insert']>
      }
      kpi_assignments: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          is_deleted: boolean
          tenant_id: string
          employee_id: string
          template_id: string | null
          period_quarter: number
          period_year: number
          targets: Json
          scores: Json
          final_score: number | null
          reviewed_by: string | null
          submitted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['kpi_assignments']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['kpi_assignments']['Insert']>
      }
      performance_reviews: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          is_deleted: boolean
          tenant_id: string
          employee_id: string
          reviewer_id: string
          period: string
          rating: number
          strengths: string | null
          improvements: string | null
          promotion_recommended: boolean
          award_given: string | null
          notes: string | null
        }
        Insert: Omit<Database['public']['Tables']['performance_reviews']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['performance_reviews']['Insert']>
      }
      training_sessions: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          is_deleted: boolean
          tenant_id: string
          company_id: string
          title: string
          description: string | null
          trainer_name: string
          start_date: string
          end_date: string
          is_mandatory: boolean
          department: string | null
        }
        Insert: Omit<Database['public']['Tables']['training_sessions']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['training_sessions']['Insert']>
      }
      medical_records: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          is_deleted: boolean
          tenant_id: string
          employee_id: string
          record_type: string
          file_url: string
          fitness_status: 'fit' | 'fit_with_conditions' | 'unfit'
          issued_by: string | null
          issued_date: string
          expiry_date: string | null
          notes: string | null
        }
        Insert: Omit<Database['public']['Tables']['medical_records']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['medical_records']['Insert']>
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string
          company_id: string
          action: string
          entity_type: string
          entity_id: string
          old_values: Json | null
          new_values: Json | null
          ip_address: string | null
          user_agent: string | null
          timestamp: string
        }
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], never>
        Update: never
      }
      announcements: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          is_deleted: boolean
          tenant_id: string
          company_id: string
          department: string | null
          title: string
          body: string
          priority: 'normal' | 'urgent'
          created_by: string
          expires_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['announcements']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['announcements']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
