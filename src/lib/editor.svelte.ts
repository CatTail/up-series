// Which record the suggestion panel is open on. Any ✎ button opens it; the one panel lives in App.
export type EditorMode = 'edit' | 'fill'

export const editor = $state<{ target: string | null; mode: EditorMode }>({ target: null, mode: 'edit' })
let opener: HTMLElement | null = null

export function openEditor(target: string, mode: EditorMode = 'edit', from?: HTMLElement | null) {
  opener = from ?? (typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null)
  editor.target = target
  editor.mode = mode
}

/** Close the panel and return focus to the button that opened it. */
export function closeEditor() {
  editor.target = null
  const el = opener
  opener = null
  if (el?.isConnected) el.focus()
}
