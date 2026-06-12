'use client'

import { useState, useCallback, RefObject } from 'react'
import type { BackgroundCheckWithSubject } from '@hr/shared'

// Tutorial refs for highlighting elements
export type TutorialRefs = {
  stats: RefObject<HTMLDivElement | null>
  alerts: RefObject<HTMLDivElement | null>
  table: RefObject<HTMLDivElement | null>
  addButton: RefObject<HTMLButtonElement | null>
  filter: RefObject<HTMLDivElement | null>
}

// Hook to manage tutorial state
export function useTutorialState() {
  const [isActive, setIsActive] = useState(false)

  const startTutorial = useCallback(() => {
    setIsActive(true)
  }, [])

  const endTutorial = useCallback(() => {
    setIsActive(false)
  }, [])

  return { isActive, startTutorial, endTutorial }
}

// Hook to check if demo mode is active
export function useDemoMode() {
  // Demo mode can be triggered by URL param or tutorial state
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    return params.get('demo') === 'true'
  }
  return false
}

// Mock data for demo/tutorial mode
export const MOCK_EMPLOYEES: Array<{ id: string; user?: { full_name: string }; employee_number: string }> = [
  { id: 'emp-001', user: { full_name: 'John Kamau' }, employee_number: 'EMP001' },
  { id: 'emp-002', user: { full_name: 'Mary Wanjiku' }, employee_number: 'EMP002' },
  { id: 'emp-003', user: { full_name: 'Peter Ochieng' }, employee_number: 'EMP003' },
]

export const MOCK_CANDIDATES: Array<{ id: string; full_name: string; email: string }> = [
  { id: 'cand-001', full_name: 'Sarah Akinyi', email: 'sarah.akinyi@example.com' },
  { id: 'cand-002', full_name: 'James Mwangi', email: 'james.mwangi@example.com' },
  { id: 'cand-003', full_name: 'Grace Njeri', email: 'grace.njeri@example.com' },
]

export const MOCK_BACKGROUND_CHECKS: BackgroundCheckWithSubject[] = [
  {
    id: 'check-001',
    company_id: 'demo-company',
    tenant_id: 'demo-tenant',
    is_deleted: false,
    employee_id: 'emp-001',
    candidate_id: null,
    check_type: 'criminal',
    status: 'passed',
    requested_by: 'user-001',
    document_url: null,
    document_uploaded_at: null,
    provider_name: null,
    provider_reference: null,
    provider_response: null,
    result_summary: 'No criminal record found',
    clearance_date: '2024-01-15',
    expiry_date: '2025-01-15',
    requested_at: '2024-01-10T10:00:00Z',
    completed_at: '2024-01-15T14:30:00Z',
    reviewed_by: null,
    flags: [],
    notes: null,
    created_at: '2024-01-10T10:00:00Z',
    updated_at: '2024-01-15T14:30:00Z',
    employee: {
      employee_number: 'EMP001',
      user: { full_name: 'John Kamau', email: 'john.kamau@company.com' },
    },
    candidate: null,
  },
  {
    id: 'check-002',
    company_id: 'demo-company',
    tenant_id: 'demo-tenant',
    is_deleted: false,
    employee_id: null,
    candidate_id: 'cand-001',
    check_type: 'employment',
    status: 'pending',
    requested_by: 'user-001',
    document_url: null,
    document_uploaded_at: null,
    provider_name: null,
    provider_reference: null,
    provider_response: null,
    result_summary: null,
    clearance_date: null,
    expiry_date: null,
    requested_at: '2024-02-01T09:00:00Z',
    completed_at: null,
    reviewed_by: null,
    flags: [],
    notes: 'Awaiting previous employer response',
    created_at: '2024-02-01T09:00:00Z',
    updated_at: '2024-02-01T09:00:00Z',
    employee: null,
    candidate: {
      full_name: 'Sarah Akinyi',
      email: 'sarah.akinyi@example.com',
    },
  },
  {
    id: 'check-003',
    company_id: 'demo-company',
    tenant_id: 'demo-tenant',
    is_deleted: false,
    employee_id: 'emp-002',
    candidate_id: null,
    check_type: 'credit',
    status: 'flagged',
    requested_by: 'user-001',
    document_url: null,
    document_uploaded_at: null,
    provider_name: null,
    provider_reference: null,
    provider_response: null,
    result_summary: 'Minor credit issues found',
    clearance_date: '2024-01-20',
    expiry_date: '2025-01-20',
    requested_at: '2024-01-18T11:00:00Z',
    completed_at: '2024-01-20T16:00:00Z',
    reviewed_by: null,
    flags: ['credit_history', 'requires_review'],
    notes: 'Has outstanding loan but making regular payments',
    created_at: '2024-01-18T11:00:00Z',
    updated_at: '2024-01-20T16:00:00Z',
    employee: {
      employee_number: 'EMP002',
      user: { full_name: 'Mary Wanjiku', email: 'mary.wanjiku@company.com' },
    },
    candidate: null,
  },
  {
    id: 'check-004',
    company_id: 'demo-company',
    tenant_id: 'demo-tenant',
    is_deleted: false,
    employee_id: 'emp-003',
    candidate_id: null,
    check_type: 'education',
    status: 'in_progress',
    requested_by: 'user-001',
    document_url: null,
    document_uploaded_at: null,
    provider_name: null,
    provider_reference: null,
    provider_response: null,
    result_summary: null,
    clearance_date: null,
    expiry_date: null,
    requested_at: '2024-02-05T08:30:00Z',
    completed_at: null,
    reviewed_by: null,
    flags: [],
    notes: 'Verifying university credentials',
    created_at: '2024-02-05T08:30:00Z',
    updated_at: '2024-02-05T08:30:00Z',
    employee: {
      employee_number: 'EMP003',
      user: { full_name: 'Peter Ochieng', email: 'peter.ochieng@company.com' },
    },
    candidate: null,
  },
]

// Tutorial component - provides guided walkthrough
export function BackgroundCheckTutorial({ refs }: { refs: TutorialRefs }) {
  const [step, setStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  const steps = [
    {
      title: 'Welcome to Background Checks',
      description: 'This module helps you manage background verification for employees and candidates.',
      target: null,
    },
    {
      title: 'Overview Statistics',
      description: 'Track the status of all background checks at a glance. See pending, passed, failed, and flagged checks.',
      target: refs.stats,
    },
    {
      title: 'Alerts & Notifications',
      description: 'Important alerts about expired checks or flagged items appear here for immediate attention.',
      target: refs.alerts,
    },
    {
      title: 'Filter Checks',
      description: 'Use the filter to view checks by status - pending, in progress, passed, failed, or flagged.',
      target: refs.filter,
    },
    {
      title: 'Background Checks List',
      description: 'View all background checks with their status, subject details, and expiry information.',
      target: refs.table,
    },
    {
      title: 'Request New Check',
      description: 'Click here to request a new background check for an employee or candidate.',
      target: refs.addButton,
    },
  ]

  // Tutorial is not rendered if not visible
  if (!isVisible) return null

  const currentStep = steps[step]
  const isLastStep = step === steps.length - 1

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-500">
            Step {step + 1} of {steps.length}
          </span>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            Skip
          </button>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {currentStep.title}
        </h3>
        <p className="text-gray-600 mb-6">
          {currentStep.description}
        </p>

        <div className="flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Back
            </button>
          )}
          <button
            onClick={() => {
              if (isLastStep) {
                setIsVisible(false)
                setStep(0)
              } else {
                setStep(s => s + 1)
              }
            }}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {isLastStep ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
