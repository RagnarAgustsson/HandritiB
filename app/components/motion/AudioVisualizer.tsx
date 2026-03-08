'use client'

import { useRef, useEffect } from 'react'

interface AudioVisualizerProps {
  stream: MediaStream | null
  barCount?: number
  className?: string
}

export default function AudioVisualizer({
  stream,
  barCount = 32,
  className = '',
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)

  useEffect(() => {
    if (!stream || !canvasRef.current) return

    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    const audioCtx = new AudioContext()
    const source = audioCtx.createMediaStreamSource(stream)
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 128
    analyser.smoothingTimeConstant = 0.8
    source.connect(analyser)

    const data = new Uint8Array(analyser.frequencyBinCount)

    function draw() {
      if (!canvasRef.current || !ctx) return
      const { width, height } = canvasRef.current

      analyser.getByteFrequencyData(data)

      ctx.clearRect(0, 0, width, height)

      const step = Math.floor(data.length / barCount)
      const barWidth = width / barCount - 2
      const radius = barWidth / 2

      for (let i = 0; i < barCount; i++) {
        const value = data[i * step] / 255
        const barHeight = Math.max(4, value * height * 0.9)
        const x = i * (barWidth + 2) + 1
        const y = (height - barHeight) / 2

        // Gradient from indigo to violet based on intensity
        const r = Math.round(99 + value * 40)
        const g = Math.round(102 - value * 40)
        const b = Math.round(241)
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.5 + value * 0.5})`

        // Rounded bars (fallback for older browsers without roundRect)
        ctx.beginPath()
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barWidth, barHeight, radius)
        } else {
          ctx.rect(x, y, barWidth, barHeight)
        }
        ctx.fill()
      }

      animRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animRef.current)
      source.disconnect()
      audioCtx.close()
    }
  }, [stream, barCount])

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={48}
      className={`w-full h-12 ${className}`}
    />
  )
}
