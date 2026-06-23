import * as faceapi from 'face-api.js'

// Models are loaded from jsDelivr CDN so no binary files need to be committed.
// For offline-first deployments, download the weights from the CDN and place
// them in /public/models/ — the path below falls back automatically.
const MODEL_URI = '/models'
// npm package doesn't bundle weight files — use GitHub CDN as fallback
const MODEL_CDN = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights'

let loaded = false

export async function loadModels() {
  if (loaded) return
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URI),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URI),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URI),
    ])
  } catch {
    // Local models not found — fall back to CDN
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_CDN),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_CDN),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_CDN),
    ])
  }
  loaded = true
}

function imageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img')
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = dataUrl
  })
}

export async function extractDescriptor(imageBase64: string): Promise<number[] | null> {
  await loadModels()
  const dataUrl = imageBase64.startsWith('data:')
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`
  const img = await imageFromDataUrl(dataUrl)
  const detection = await faceapi
    .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks(true)
    .withFaceDescriptor()
  if (!detection) return null
  return Array.from(detection.descriptor)
}

export function compareFaces(
  stored: number[],
  live: number[],
  threshold = 0.50,
): { verified: boolean; distance: number } {
  const dist = faceapi.euclideanDistance(
    new Float32Array(stored),
    new Float32Array(live),
  )
  return { verified: dist < threshold, distance: dist }
}
