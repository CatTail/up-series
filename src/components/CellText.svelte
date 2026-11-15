<script lang="ts">
  import { t, pick } from '../lib/i18n.svelte.ts'
  import type { CellView } from '../lib/states.ts'

  let { cell, withNote = true }: { cell: CellView; withNote?: boolean } = $props()
</script>

{#if cell.kind === 'text'}<span>{pick(cell.text)}</span>{:else if cell.kind === 'not_found'}<span class="nf">{t('state.notFound')}</span>{:else if cell.kind === 'not_applicable'}<span class="na">{pick(cell.reason)}</span>{:else}<span class="part">{t(`status.${cell.p}`)}{#if withNote && cell.note}<span class="note">（{pick(cell.note)}）</span>{/if}</span>{/if}

<style>
  .nf, .na { color: var(--muted); }
  .part { color: var(--ink2); }
  .note { color: var(--muted); }
</style>
