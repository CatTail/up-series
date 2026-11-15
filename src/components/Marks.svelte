<script lang="ts">
  import { t } from '../lib/i18n.svelte.ts'
  import type { StatusMarks } from '../lib/states.ts'

  let { marks }: { marks: StatusMarks } = $props()
</script>

{#if marks.special || marks.died}
  <span class="marks">
    {#if marks.special}<span class="mark">◇ {t(`mark.${marks.special}`)}</span>{/if}
    {#if marks.died}<span class="mark">† {marks.died}</span>{/if}
  </span>
{/if}

<style>
  .marks { display: inline-flex; flex-wrap: wrap; gap: 4px; margin: 1px 0 2px; }
  .mark { font-size: 11px; line-height: 1.4; border: 1px solid var(--axis); border-radius: 999px; padding: 0 6px; color: var(--ink2); white-space: nowrap; }
</style>
