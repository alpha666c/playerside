/**
 * Device capability detection for the hero field.
 *
 * Ultra-premium sites tier the experience: full quality on capable desktops,
 * capped DPR on mid-range, nothing on weak/old devices — content never waits
 * on the decorative layer. All checks run client-side only.
 */

export type QualityTier = 'high' | 'medium' | 'off'

let webglSupport: boolean | null = null

export const webglSupported = (): boolean => {
  if (typeof window === 'undefined') return false
  if (webglSupport !== null) return webglSupport
  try {
    const canvas = document.createElement('canvas')
    webglSupport = !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    )
  } catch {
    webglSupport = false
  }
  return webglSupport
}

export const getQualityTier = (): QualityTier => {
  if (typeof window === 'undefined' || !webglSupported()) return 'off'
  const nav = navigator as Navigator & { deviceMemory?: number }
  const concurrency = nav.hardwareConcurrency ?? 4
  const memory = nav.deviceMemory ?? 4
  if (concurrency >= 8 && memory >= 8) return 'high'
  if (concurrency >= 4 && memory >= 4) return 'medium'
  return 'off'
}

/** Pixel ratio cap per tier — the biggest lever on GPU cost. */
export const pixelRatioForTier = (tier: QualityTier): number => {
  if (tier === 'off') return 1
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  return tier === 'high' ? dpr : Math.min(dpr, 1.5)
}
