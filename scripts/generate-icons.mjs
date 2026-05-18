#!/usr/bin/env node
/**
 * Generates branded PNG icons for the PWA and dashboard.
 * Zero external dependencies — uses only Node.js built-ins.
 *
 * Run from repo root: node scripts/generate-icons.mjs
 */
import { deflateSync } from 'zlib'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// Brand colors [R, G, B]
const NAVY   = [0x1A, 0x2E, 0x5A]
const ORANGE = [0xF4, 0x79, 0x20]
const WHITE  = [0xFF, 0xFF, 0xFF]

// ── Pixel letter glyphs (1 = ink, 0 = empty) ────────────────────────────────
const S = [
  [0,1,1,1,0],
  [1,0,0,0,1],
  [1,0,0,0,0],
  [0,1,1,1,0],
  [0,0,0,0,1],
  [1,0,0,0,1],
  [0,1,1,1,0],
]
const L = [
  [1,0,0,0],
  [1,0,0,0],
  [1,0,0,0],
  [1,0,0,0],
  [1,0,0,0],
  [1,0,0,0],
  [1,1,1,1],
]

// SDF for a pill (capsule) shape
function inPill(x, y, cx, cy, pw, ph) {
  const pr = ph / 2
  const ex = Math.max(Math.abs(x - cx) - (pw / 2 - pr), 0)
  const ey = Math.abs(y - cy)
  return ex * ex + ey * ey <= pr * pr
}

// Returns [R,G,B] for the icon pixel at (x,y) in a w×h canvas
function iconPixel(x, y, w, h) {
  const cx = w / 2
  const cy = h / 2
  const scale = w / 192

  const pillW = 128 * scale
  const pillH = 74 * scale

  if (!inPill(x, y, cx, cy, pillW, pillH)) return NAVY

  // Inside the pill: draw "SL" in navy on orange background
  const ls     = Math.max(1, Math.round(8 * scale))  // pixels per glyph unit
  const sW     = 5 * ls
  const lW     = 4 * ls
  const gap    = ls
  const lH     = 7 * ls
  const totalW = sW + gap + lW
  const sx     = cx - totalW / 2
  const sy     = cy - lH / 2

  const relX = x - sx
  const relY = y - sy

  if (relX >= 0 && relX < totalW && relY >= 0 && relY < lH) {
    const col = Math.floor(relX / ls)
    const row = Math.floor(relY / ls)

    if (col < 5 && row < 7 && S[row]?.[col] === 1) return NAVY

    const lCol = col - (5 + 1)  // shift past S + gap
    if (lCol >= 0 && lCol < 4 && row < 7 && L[row]?.[lCol] === 1) return NAVY
  }

  return ORANGE
}

// Small 32×32 favicon: navy field + orange oval centre
function faviconPixel(x, y, w, h) {
  return inPill(x, y, w / 2, h / 2, w * 0.80, h * 0.56) ? ORANGE : NAVY
}

// 280×80 wide logo banner: icon mark (80×80) on left, navy field to the right
function logoPixel(x, y, _w, h) {
  if (x < 80) return iconPixel(x, y, 80, h)
  return NAVY
}

// ── CRC32 (required for PNG chunks) ─────────────────────────────────────────
const CRC_TABLE = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
  CRC_TABLE[n] = c
}
function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (const b of buf) crc = CRC_TABLE[(crc ^ b) & 0xFF] ^ (crc >>> 8)
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function pngChunk(type, data) {
  const t   = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])), 0)
  return Buffer.concat([len, t, data, crcBuf])
}

function makePNG(w, h, pixelFn) {
  // Raw image data: per-row filter byte (0x00 = None) followed by RGB pixels
  const raw = Buffer.allocUnsafe(h * (1 + w * 3))
  for (let y = 0; y < h; y++) {
    const rowBase = y * (1 + w * 3)
    raw[rowBase] = 0  // filter: None
    for (let x = 0; x < w; x++) {
      const [r, g, b] = pixelFn(x, y, w, h)
      const off = rowBase + 1 + x * 3
      raw[off] = r; raw[off + 1] = g; raw[off + 2] = b
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8  // 8-bit depth
  ihdr[9] = 2  // colour type: RGB (no alpha, simplest format)

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

function write(outPath, w, h, fn) {
  writeFileSync(outPath, makePNG(w, h, fn))
  console.log(`  ✓  ${outPath.replace(ROOT + '/', '')}  (${w}×${h})`)
}

// ── Output ────────────────────────────────────────────────────────────────────
const pwaIconsDir = join(ROOT, 'apps/pwa/public/icons')
const dashPubDir  = join(ROOT, 'apps/dashboard/public')
mkdirSync(pwaIconsDir, { recursive: true })
mkdirSync(dashPubDir,  { recursive: true })

console.log('\nGenerating brand icons…\n')
write(join(pwaIconsDir, 'icon-192x192.png'), 192, 192, iconPixel)
write(join(pwaIconsDir, 'icon-512x512.png'), 512, 512, iconPixel)
write(join(dashPubDir,  'favicon.png'),       32,  32, faviconPixel)
write(join(dashPubDir,  'logo.png'),          280,  80, logoPixel)
console.log('\nDone.\n')
