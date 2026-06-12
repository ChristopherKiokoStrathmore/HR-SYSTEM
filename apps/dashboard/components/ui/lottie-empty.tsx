'use client'

import Lottie from 'lottie-react'
import emptyAnimation from '../../public/lottie/empty.json'

interface LottieEmptyProps {
  message?: string
  description?: string
  className?: string
}

export function LottieEmpty({ message = 'Nothing here yet', description, className }: LottieEmptyProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-14 text-center ${className ?? ''}`}>
      <Lottie
        animationData={emptyAnimation}
        loop
        className="w-24 h-12 mb-4"
        rendererSettings={{ preserveAspectRatio: 'xMidYMid meet' }}
      />
      <p className="text-sm font-semibold text-text-muted">{message}</p>
      {description && <p className="text-xs text-text-muted/70 mt-1 max-w-xs">{description}</p>}
    </div>
  )
}
