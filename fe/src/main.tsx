import './index.css'
import { createRoot } from 'react-dom/client'

type CubismWindow = Window & {
  Live2DCubismCore?: unknown
  CubismCore?: unknown
}

function loadCubism() {
  const cubismWindow = window as CubismWindow

  if (cubismWindow.Live2DCubismCore || cubismWindow.CubismCore) {
    cubismWindow.Live2DCubismCore =
      cubismWindow.Live2DCubismCore ?? cubismWindow.CubismCore
    return Promise.resolve()
  }

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = '/live2dcubismcore.min.js'
    script.async = false

    script.onload = () => {
      cubismWindow.Live2DCubismCore =
        cubismWindow.Live2DCubismCore ?? cubismWindow.CubismCore

      if (!cubismWindow.Live2DCubismCore) {
        reject(new Error('Cubism global missing'))
        return
      }

      resolve()
    }

    script.onerror = () => reject(new Error('Failed to load Cubism'))

    document.head.appendChild(script)
  })
}

async function bootstrap() {
  // 🔥 1. Load Cubism trước
  await loadCubism()

  // 🔥 2. Import App sau
  const { default: App } = await import('./App.tsx')

  // 🔥 3. Render
  const root = document.getElementById('root')!
  createRoot(root).render(<App />)
}

bootstrap().catch((error) => {
  console.error('Bootstrap error:', error)
})