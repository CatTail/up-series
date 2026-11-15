<script lang="ts">
  import type { Bilingual } from '../lib/data/types.ts'
  import { i18n } from '../lib/i18n.svelte.ts'

  let { text, original }: { text: Bilingual; original?: string } = $props()
</script>

{#if i18n.lang === 'zh'}<span title={original} lang="zh-CN">{text.zh}</span>{:else}<span lang="en">{text.en}</span>{/if}
