import { createCanvas } from 'canvas'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public')

function drawIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, size, size)

  // Rounded white rectangle, centered
  const rectSize = size * 0.72
  const rectX = (size - rectSize) / 2
  const rectY = (size - rectSize) / 2
  const radius = size * 0.18

  ctx.fillStyle = '#FFFFFF'
  ctx.beginPath()
  ctx.moveTo(rectX + radius, rectY)
  ctx.arcTo(rectX + rectSize, rectY, rectX + rectSize, rectY + rectSize, radius)
  ctx.arcTo(rectX + rectSize, rectY + rectSize, rectX, rectY + rectSize, radius)
  ctx.arcTo(rectX, rectY + rectSize, rectX, rectY, radius)
  ctx.arcTo(rectX, rectY, rectX + rectSize, rectY, radius)
  ctx.closePath()
  ctx.fill()

  // Letter "M", sized to fill ~60% of the icon
  ctx.fillStyle = '#007AFF'
  ctx.font = `bold ${Math.round(size * 0.6)}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('M', size / 2, size / 2 + size * 0.03)

  return canvas
}

const size512 = drawIcon(512)
writeFileSync(join(outDir, 'icon-512.png'), size512.toBuffer('image/png'))

const size192 = drawIcon(192)
writeFileSync(join(outDir, 'icon-192.png'), size192.toBuffer('image/png'))

console.log('Generated icon-512.png and icon-192.png in frontend/public/')
