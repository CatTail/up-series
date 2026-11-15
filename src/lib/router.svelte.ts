import { parseRoute, toHash, type Route } from './route.ts'

export const router = $state<{ route: Route }>({ route: parseRoute(typeof location === 'undefined' ? '' : location.hash) })

/** Navigate. `replace` updates the URL without a new history entry (e.g. slider drags). */
export function navigate(r: Route, opts: { replace?: boolean } = {}): void {
  const hash = toHash(r)
  router.route = parseRoute(hash)
  if (opts.replace) history.replaceState(null, '', hash)
  else if (location.hash !== hash) location.hash = hash
}

/** Start listening to hashchange; returns a stop function. */
export function startRouter(): () => void {
  const on = () => {
    router.route = parseRoute(location.hash)
  }
  on()
  window.addEventListener('hashchange', on)
  return () => window.removeEventListener('hashchange', on)
}
