'use client'

import Lottie from 'lottie-react'
import emptyAnimation from '../../public/lottie/empty.json'

interface LottieEmptyProps {
  message?: string
  description?: string
  className?: string
}

export function LottieEmpty({ message, description, className }: LottieEmptyProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-10 text-center ${className ?? ''}`}>
      <Lottie
        animationData={emptyAnimation}
        loop
        className="w-20 h-10 mb-3"
        rendererSettings={{ preserveAspectRatio: 'xMidYMid meet' }}
      />
      {message && <p className="text-sm font-medium text-text-muted">{message}</p>}
      {description && <p className="text-xs text-text-muted/70 mt-1 max-w-xs">{description}</p>}
    </div>
  )
}
