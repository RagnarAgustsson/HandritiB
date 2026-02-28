// Split a large audio file into chunks small enough for Whisper (max 25MB per call)
// No FFmpeg — pure byte slicing. Works because Whisper is tolerant of partial webm/mp4 segments.

const MAX_CHUNK_BYTES = 20 * 1024 * 1024 // 20MB safety margin (Whisper limit is 25MB)
const MAX_FILE_BYTES = 200 * 1024 * 1024 // 200MB max upload

export interface AudioChunkInfo {
  data: Buffer
  index: number
  totalChunks: number
  filename: string
}

export function splitAudioBuffer(buffer: Buffer, originalFilename: string): AudioChunkInfo[] {
  if (buffer.byteLength > MAX_FILE_BYTES) {
    throw new Error(`Skráin er of stór. Hámark er ${MAX_FILE_BYTES / 1024 / 1024}MB.`)
  }

  if (buffer.byteLength <= MAX_CHUNK_BYTES) {
    return [{ data: buffer, index: 0, totalChunks: 1, filename: originalFilename }]
  }

  const chunks: AudioChunkInfo[] = []
  let offset = 0
  let index = 0
  const ext = originalFilename.split('.').pop() || 'webm'

  while (offset < buffer.byteLength) {
    const end = Math.min(offset + MAX_CHUNK_BYTES, buffer.byteLength)
    const chunk = buffer.slice(offset, end)
    chunks.push({
      data: chunk,
      index,
      totalChunks: 0, // filled in after
      filename: `hluti-${index}.${ext}`,
    })
    offset = end
    index++
  }

  // Fill in totalChunks now that we know it
  return chunks.map(c => ({ ...c, totalChunks: chunks.length }))
}

export function getSupportedMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  const map: Record<string, string> = {
    mp3: 'audio/mpeg',
    mp4: 'audio/mp4',
    m4a: 'audio/mp4',
    wav: 'audio/wav',
    webm: 'audio/webm',
    ogg: 'audio/ogg',
    flac: 'audio/flac',
  }
  return map[ext || ''] || 'audio/webm'
}
