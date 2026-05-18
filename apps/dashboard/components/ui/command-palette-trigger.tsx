'use client'

import { useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { CommandPalette } from './command-palette'

export function CommandPaletteTrigger() {
  const [open, setOpen] = useState(false)

  useHotkeys(['meta+k', 'ctrl+k'], (e) => {
    e.preventDefault()
    setOpen((v) => !v)
  })

  return <CommandPalette open={open} onClose={() => setOpen(false)} />
}
