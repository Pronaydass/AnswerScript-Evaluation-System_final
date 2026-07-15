import { useEffect, useRef } from 'react'
import { Box } from '@mui/material'

export default function ImageAnnotator({ imageUrl, highlights = {correct: [], incorrect: []} }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = imageUrl

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      const sx = canvas.width / img.naturalWidth
      const sy = canvas.height / img.naturalHeight

      highlights.correct?.forEach(box => {
        const x = (box.x0 || 0) * sx
        const y = (box.y0 || 0) * sy
        const h = ((box.y1 || box.y0 + 30) - (box.y0 || 0)) * sy

        ctx.fillStyle = '#22c55e'
        ctx.beginPath()
        ctx.arc(x - 15, y + h/2, 12, 0, 2 * Math.PI)
        ctx.fill()

        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(x - 20, y + h/2)
        ctx.lineTo(x - 15, y + h/2 + 5)
        ctx.lineTo(x - 8, y + h/2 - 5)
        ctx.stroke()

        if (box.question) {
          ctx.fillStyle = '#1e40af'
          ctx.font = 'bold 18px Inter'
          ctx.fillText(box.question, x - 50, y + h/2 + 5)
        }
      })

      highlights.incorrect?.forEach(box => {
        const x = (box.x0 || 0) * sx
        const y = (box.y0 || 0) * sy
        const h = ((box.y1 || box.y0 + 30) - (box.y0 || 0)) * sy

        ctx.fillStyle = '#ef4444'
        ctx.beginPath()
        ctx.arc(x - 15, y + h/2, 12, 0, 2 * Math.PI)
        ctx.fill()

        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(x - 20, y + h/2 - 5)
        ctx.lineTo(x - 10, y + h/2 + 5)
        ctx.moveTo(x - 10, y + h/2 - 5)
        ctx.lineTo(x - 20, y + h/2 + 5)
        ctx.stroke()
      })
    }
  }, [imageUrl, highlights])

  return (
    <Box sx={{ width: '100%', border: '2px solid #e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: 'auto', display: 'block' }} />
    </Box>
  )
}