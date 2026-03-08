'use client'

import { motion } from 'motion/react'

interface AnimatedProgressProps {
  percent: number
  colorClass: string
}

export default function AnimatedProgress({ percent, colorClass }: AnimatedProgressProps) {
  return (
    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${colorClass}`}
        initial={{ width: 0 }}
        animate={{ width: `${percent}%` }}
        transition={{ duration: 0.8, ease: [0.25, 0.4, 0.25, 1] }}
      />
    </div>
  )
}
