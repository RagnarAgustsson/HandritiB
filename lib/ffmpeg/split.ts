// EXPERIMENTAL: stórar skrár — client-side audio splitting with ffmpeg.wasm
'use client'

import type { FFmpeg } from '@ffmpeg/ffmpeg'

let ffmpegInstance: FFmpeg | null = null

const SEGMENT_SECONDS = 300 // 5 mín → alltaf undir 1400s hámarki gpt-4o-transcribe

/**
 * Hlaða ffmpeg.wasm (single-threaded, frá CDN).
 * Cached — hleður aðeins einu sinni.
 */
export async function loadFFmpeg(onProgress?: (pct: number) => void): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance

  const { FFmpeg } = await import('@ffmpeg/ffmpeg')
  const { toBlobURL } = await import('@ffmpeg/util')

  const ffmpeg = new FFmpeg()

  if (onProgress) {
    ffmpeg.on('progress', ({ progress }) => {
      onProgress(Math.round(progress * 100))
    })
  }

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  })

  ffmpegInstance = ffmpeg
  return ffmpeg
}

/**
 * Klippa hljóðskrá í ~5 mín hluta með -c copy (ekkert re-encoding).
 * Skilar fylki af Blob hlutum.
 */
export async function splitAudio(
  file: File,
  onProgress?: (msg: string) => void
): Promise<Blob[]> {
  const ffmpeg = await loadFFmpeg()

  const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || 'webm')
  const inputName = `input${ext}`

  // Skrifa skrá í sýndar-skráakerfi
  onProgress?.('Undirbý skrá...')
  const buffer = await file.arrayBuffer()
  await ffmpeg.writeFile(inputName, new Uint8Array(buffer))

  // Klippa í hluta
  onProgress?.('Klippi...')
  const outputPattern = `chunk_%03d${ext}`
  await ffmpeg.exec([
    '-i', inputName,
    '-f', 'segment',
    '-segment_time', String(SEGMENT_SECONDS),
    '-c', 'copy',
    '-reset_timestamps', '1',
    outputPattern,
  ])

  // Lesa útkomu
  const chunks: Blob[] = []
  const mimeMap: Record<string, string> = {
    '.mp3': 'audio/mpeg',
    '.m4a': 'audio/mp4',
    '.mp4': 'audio/mp4',
    '.wav': 'audio/wav',
    '.webm': 'audio/webm',
    '.ogg': 'audio/ogg',
    '.flac': 'audio/flac',
  }
  const mime = mimeMap[ext] || 'audio/webm'

  for (let i = 0; i < 100; i++) {
    const name = `chunk_${String(i).padStart(3, '0')}${ext}`
    try {
      const data = await ffmpeg.readFile(name)
      if (data instanceof Uint8Array) {
        chunks.push(new Blob([new Uint8Array(data as Uint8Array)], { type: mime }))
      }
      // Hreinsa úr minni
      await ffmpeg.deleteFile(name)
    } catch {
      break // Engir fleiri hlutar
    }
  }

  // Hreinsa input
  try { await ffmpeg.deleteFile(inputName) } catch { /* */ }

  if (chunks.length === 0) {
    throw new Error('Klipping mistókst — engir hlutar búnir til')
  }

  return chunks
}
