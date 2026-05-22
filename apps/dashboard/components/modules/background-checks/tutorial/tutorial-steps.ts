export type TutorialStepType = 'modal' | 'spotlight'
export type TargetRef = 'stats' | 'alerts' | 'table' | 'addButton' | 'filter' | null
export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right'

export interface TutorialStep {
  id: string
  type: TutorialStepType
  title: string
  description: string
  tip?: string
  targetRef: TargetRef
  position: TooltipPosition
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    type: 'modal',
    title: 'Welcome to Background Checks',
    description: 'This feature helps you manage background verification for candidates and employees. You can request criminal record checks (PCC), employment verification, education verification, and more.',
    tip: 'Background checks are essential for compliance, risk management, and maintaining workplace safety.',
    targetRef: null,
    position: 'bottom',
  },
  {
    id: 'stats',
    type: 'spotlight',
    title: 'Dashboard Overview',
    description: 'These cards show the current status of all background checks at a glance. Monitor pending requests, track verifications in progress, and quickly identify any failed or flagged results that need attention.',
    targetRef: 'stats',
    position: 'bottom',
  },
  {
    id: 'alerts',
    type: 'spotlight',
    title: 'Important Alerts',
    description: 'When background checks expire or get flagged, alerts appear here. Expired checks need renewal, and flagged checks require HR review before proceeding with hiring decisions.',
    tip: 'Criminal record clearances typically expire after 1 year and should be renewed.',
    targetRef: 'alerts',
    position: 'bottom',
  },
  {
    id: 'table',
    type: 'spotlight',
    title: 'Background Check Records',
    description: 'Each row displays a background check with the person\'s name, check type, request date, and current status. You can see whether they are a candidate or an existing employee.',
    tip: 'Click "Review" on pending checks to complete the verification process.',
    targetRef: 'table',
    position: 'top',
  },
  {
    id: 'request',
    type: 'spotlight',
    title: 'Request a New Check',
    description: 'Click this button to initiate a new background check. You can request checks for job candidates during hiring or for existing employees who need renewals.',
    tip: 'You can upload existing certificates directly if the candidate already has a valid PCC.',
    targetRef: 'addButton',
    position: 'bottom',
  },
  {
    id: 'filter',
    type: 'spotlight',
    title: 'Filter by Status',
    description: 'Use this dropdown to filter checks by their status. This helps you focus on pending reviews, track in-progress verifications, or identify failed checks.',
    targetRef: 'filter',
    position: 'bottom',
  },
  {
    id: 'complete',
    type: 'modal',
    title: 'You\'re Ready!',
    description: 'You now know how to request, review, and manage background checks. Start by requesting your first background check for a candidate or employee.',
    tip: 'Pro tip: Enable "Background Check Required" in Company Settings to make checks mandatory for all new hires.',
    targetRef: null,
    position: 'bottom',
  },
]
