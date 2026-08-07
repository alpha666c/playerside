/**
 * External scroll-velocity store.
 *
 * Scroll velocity changes ~60×/s. Putting that in React state on the provider
 * re-renders the entire motion subtree every frame — including any R3F canvas.
 * Instead, velocity lives here as a module singleton; consumers opt in with
 * `useScrollVelocity` (useSyncExternalStore) and re-render in isolation.
 */

let currentVelocity = 0

const listeners = new Set<() => void>()

export const setVelocity = (velocity: number): void => {
  if (velocity === currentVelocity) return
  currentVelocity = velocity
  listeners.forEach((listener) => listener())
}

export const subscribeVelocity = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const getVelocity = (): number => currentVelocity
