'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { TooltipPosition } from './tutorial-steps'

interface TutorialOverlayProps {
  targetRef: React.RefObject<HTMLElement> | null
  position: TooltipPosition
  children: React.ReactNode
  isActive: boolean
}

export function TutorialOverlay({
  targetRef,
  position,
  children,
  isActive,
}: TutorialOverlayProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isActive || !targetRef?.current) {
      setTargetRect(null)
      return
    }

    const updateRect = () => {
      if (targetRef.current) {
        setTargetRect(targetRef.current.getBoundingClientRect())
      }
    }

    updateRect()

    // Update on scroll/resize
    window.addEventListener('scroll', updateRect, true)
    window.addEventListener('resize', updateRect)

    return () => {
      window.removeEventListener('scroll', updateRect, true)
      window.removeEventListener('resize', updateRect)
    }
  }, [targetRef, isActive])

  if (!isActive) return null

  const padding = 8
  const tooltipOffset = 16

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }

    const style: React.CSSProperties = {}

    switch (position) {
      case 'bottom':
        style.top = targetRect.bottom + tooltipOffset
        style.left = targetRect.left + targetRect.width / 2
        style.transform = 'translateX(-50%)'
        break
      case 'top':
        style.bottom = window.innerHeight - targetRect.top + tooltipOffset
        style.left = targetRect.left + targetRect.width / 2
        style.transform = 'translateX(-50%)'
        break
      case 'left':
        style.top = targetRect.top + targetRect.height / 2
        style.right = window.innerWidth - targetRect.left + tooltipOffset
        style.transform = 'translateY(-50%)'
        break
      case 'right':
        style.top = targetRect.top + targetRect.height / 2
        style.left = targetRect.right + tooltipOffset
        style.transform = 'translateY(-50%)'
        break
    }

    return style
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[60]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Dark overlay with spotlight cutout */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <mask id="spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.left - padding}
                  y={targetRect.top - padding}
                  width={targetRect.width + padding * 2}
                  height={targetRect.height + padding * 2}
                  rx="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.7)"
            mask="url(#spotlight-mask)"
          />
        </svg>

        {/* Spotlight ring animation */}
        {targetRect && (
          <div
            className="absolute pointer-events-none"
            style={{
              top: targetRect.top - padding,
              left: targetRect.left - padding,
              width: targetRect.width + padding * 2,
              height: targetRect.height + padding * 2,
            }}
          >
            <div className="absolute inset-0 rounded-xl ring-4 ring-accent/50 animate-pulse" />
          </div>
        )}

        {/* Tooltip content */}
        <motion.div
          ref={tooltipRef}
          className="fixed z-[61] max-w-md"
          style={getTooltipStyle()}
          initial={{ opacity: 0, scale: 0.95, y: position === 'bottom' ? -8 : position === 'top' ? 8 : 0 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.2, delay: 0.1 }}
        >
          {/* Arrow */}
          <div
            className={cn(
              'absolute w-3 h-3 bg-surface rotate-45',
              position === 'bottom' && 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2',
              position === 'top' && 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2',
              position === 'left' && 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2',
              position === 'right' && 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2',
            )}
          />
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
