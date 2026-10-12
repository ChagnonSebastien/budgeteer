import { registerSW } from 'virtual:pwa-register'

export const registerServiceWorker = () =>
  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return
      // Checking only on foregrounding: a found update reloads the page, which would drop an open form mid-use.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && navigator.onLine) registration.update().catch(console.error)
      })
    },
  })
