import { parseRoute, toHash, type Route } from './route.ts'

export const router = $state<{ route: Route }>({ route: parseRoute(typeof location === 'undefined' ? '' : location.hash) })

/** A "page" is the route name plus the person shown; filters and the slider stay on the same page. */
const pageKey = (r: Route) => (r.name === 'person' ? `person/${r.id}` : r.name)

function setRoute(next: Route) {
  const changedPage = pageKey(next) !== pageKey(router.route)
  router.route = next
  if (changedPage && typeof window !== 'undefined' && typeof window.scrollTo === 'function') window.scrollTo(0, 0)
}

/** Navigate. `replace` updates the URL without a new history entry (e.g. slider drags, typing a search). */
export function navigate(r: Route, opts: { replace?: boolean } = {}): void {
  const hash = toHash(r)
  setRoute(parseRoute(hash))
  if (opts.replace) history.replaceState(null, '', hash)
  else if (location.hash !== hash) location.hash = hash
}

/** Start listening to hashchange; returns a stop function. */
export function startRouter(): () => void {
  const on = () => setRoute(parseRoute(location.hash))
  on()
  window.addEventListener('hashchange', on)
  return () => window.removeEventListener('hashchange', on)
}
