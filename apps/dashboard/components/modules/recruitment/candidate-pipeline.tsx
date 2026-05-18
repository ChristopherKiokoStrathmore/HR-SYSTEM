'use client'

import { useState, useRef } from 'react'
import { useCandidates, useUpdateCandidateStage } from '@/lib/hooks/use-candidates'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/lib/toast'
import type { CandidateWithPosting, CandidateStage } from '@hr/shared'
import { User, Sparkles, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useVirtualizer } from '@tanstack/react-virtual'
import { motion } from 'framer-motion'

const STAGES: { key: CandidateStage; label: string; color: string; accent: string }[] = [
  { key: 'screened',     label: 'Screened',    color: 'border-t-blue-400',   accent: '#60A5FA' },
  { key: 'interview_l1', label: 'L1 Interview', color: 'border-t-purple-400', accent: '#A78BFA' },
  { key: 'interview_l2', label: 'L2 Interview', color: 'border-t-amber-400',  accent: '#FBBF24' },
  { key: 'offer_sent',   label: 'Offer Sent',   color: 'border-t-orange-400', accent: '#F47920' },
  { key: 'hired',        label: 'Hired',        color: 'border-t-green-500',  accent: '#22C55E' },
  { key: 'rejected',     label: 'Rejected',     color: 'border-t-red-400',    accent: '#F87171' },
]

// Card content shared between live cards and the drag overlay ghost
function CardContent({ candidate, compact }: { candidate: CandidateWithPosting; compact?: boolean }) {
  return (
    <>
      <div className="flex items-start gap-2">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-text-primary truncate">{candidate.full_name}</p>
            {candidate.source === 'portal' && (
              <Globe className="w-3 h-3 text-accent flex-shrink-0" aria-label="Applied via Job Portal" />
            )}
          </div>
          <p className="text-xs text-text-muted truncate">{candidate.email}</p>
        </div>
      </div>

      {candidate.ai_score !== null && (
        <div className="mt-2 flex items-center gap-2">
          <Sparkles className="w-3 h-3 text-accent flex-shrink-0" />
          <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full',
                candidate.ai_score >= 75 ? 'bg-green-500' :
                candidate.ai_score >= 50 ? 'bg-amber-500' : 'bg-red-500'
              )}
              style={{ width: `${candidate.ai_score}%` }}
            />
          </div>
          <span className="text-xs font-medium text-text-primary">{candidate.ai_score}%</span>
        </div>
      )}

      {candidate.ai_summary && (
        <p className="text-xs text-text-muted mt-2 line-clamp-2">{candidate.ai_summary}</p>
      )}
    </>
  )
}

function DraggableCard({ candidate, onCardClick }: { candidate: CandidateWithPosting; onCardClick: (c: CandidateWithPosting) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: candidate.id })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onCardClick(candidate)}
      className={cn(
        'bg-card border border-border rounded-lg p-3 cursor-pointer select-none transition-all mb-2 group',
        isDragging ? 'opacity-30 shadow-none scale-95 cursor-grabbing' : 'shadow-sm hover:shadow-card hover:border-accent/40'
      )}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
    >
      <CardContent candidate={candidate} />
    </div>
  )
}

function VirtualCardList({ candidates, onCardClick }: { candidates: CandidateWithPosting[]; onCardClick: (c: CandidateWithPosting) => void }) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: candidates.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 116,
    overscan: 4,
  })

  return (
    <div ref={parentRef} className="overflow-y-auto max-h-[58vh] pr-0.5">
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((vItem) => (
          <div
            key={vItem.key}
            data-index={vItem.index}
            ref={virtualizer.measureElement}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${vItem.start}px)` }}
          >
            <DraggableCard candidate={candidates[vItem.index]} onCardClick={onCardClick} />
          </div>
        ))}
      </div>
    </div>
  )
}

function DroppableColumn({
  stage, candidates, onCardClick,
}: {
  stage: typeof STAGES[number]
  candidates: CandidateWithPosting[]
  onCardClick: (c: CandidateWithPosting) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.key })

  return (
    <motion.div
      ref={setNodeRef}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      className={cn(
        'flex-shrink-0 w-64 border-t-4 rounded-xl p-3 transition-colors duration-150',
        stage.color,
        isOver ? 'ring-2 ring-offset-1 bg-accent/5' : 'bg-surface'
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-text-primary">{stage.label}</p>
        <span
          className="text-xs font-semibold rounded-full px-2 py-0.5"
          style={{ background: `${stage.accent}1A`, color: stage.accent }}
        >
          {candidates.length}
        </span>
      </div>

      {candidates.length === 0 ? (
        <div className="flex items-center justify-center py-10 border-2 border-dashed border-border/60 rounded-lg text-text-muted/50">
          <p className="text-xs">Drop here</p>
        </div>
      ) : (
        <VirtualCardList candidates={candidates} onCardClick={onCardClick} />
      )}
    </motion.div>
  )
}

interface Props {
  jobPostingId: string
  onCandidateClick: (candidate: CandidateWithPosting) => void
}

export function CandidatePipeline({ jobPostingId, onCandidateClick }: Props) {
  const { data, isLoading } = useCandidates({ jobPostingId })
  const moveStage = useUpdateCandidateStage()
  const [activeCandidate, setActiveCandidate] = useState<CandidateWithPosting | null>(null)

  const candidates = data?.data ?? []

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } })
  )

  function onDragStart(event: DragStartEvent) {
    setActiveCandidate(candidates.find((c) => c.id === event.active.id) ?? null)
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveCandidate(null)
    if (!over) return

    const newStage = over.id as CandidateStage
    const candidate = candidates.find((c) => c.id === active.id)
    if (!candidate || candidate.current_stage === newStage) return

    try {
      await moveStage.mutateAsync({ id: active.id as string, stage: newStage })
      const stageName = STAGES.find((s) => s.key === newStage)?.label ?? newStage
      toast.success(`Moved to ${stageName}`)
    } catch {
      toast.error('Failed to move candidate')
    }
  }

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((s) => (
          <div key={s.key} className="flex-shrink-0 w-64">
            <Skeleton className="h-6 w-32 mb-3" />
            <div className="space-y-3">
              <Skeleton className="h-28 w-full rounded-lg" />
              <Skeleton className="h-28 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => (
          <DroppableColumn
            key={stage.key}
            stage={stage}
            candidates={candidates.filter((c) => c.current_stage === stage.key)}
            onCardClick={onCandidateClick}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
        {activeCandidate && (
          <div className="bg-card border border-border rounded-lg p-3 shadow-float w-64 rotate-1 scale-[1.04] opacity-95">
            <CardContent candidate={activeCandidate} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
