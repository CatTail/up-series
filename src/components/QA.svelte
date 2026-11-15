<script lang="ts">
  import type { DataIndex } from '../lib/data/index.ts'
  import type { Question } from '../lib/data/types.ts'
  import { t } from '../lib/i18n.svelte.ts'
  import Bi from './Bi.svelte'
  import SourceList from './SourceList.svelte'

  let { idx, q, showQuote = false, showSource = true }: { idx: DataIndex; q: Question; showQuote?: boolean; showSource?: boolean } = $props()
</script>

<div class="qa" data-q={q.id}>
  <div><b>{t('qa.q')}：</b><Bi text={{ zh: q.zh, en: q.en }} original={q.en} /></div>
  {#if q.answerSummary}<div class="sum"><b>{t('qa.summary')}：</b><Bi text={q.answerSummary} /></div>{/if}
  {#if showQuote && q.answerQuote}<div class="quote"><b>{t('qa.quote')}：</b>“<Bi text={q.answerQuote} original={q.answerQuote.en} />”</div>{/if}
  <div class="meta">
    {#if q.attribution === 'film_only'}<span class="tag">{t('qa.filmOnly')}</span>{/if}
    {#if q.fromRecap}<span class="tag">{t('qa.fromRecap')}</span>{/if}
    {#if showSource}<SourceList {idx} ids={[q.sourceId]} locator={q.locator} />{/if}
  </div>
</div>

<style>
  .qa { font-size: 13px; background: var(--page); border-radius: 6px; padding: 6px 10px; margin-top: 6px; }
  .sum, .quote { color: var(--ink2); }
  .quote { font-style: italic; }
  .meta { margin-top: 2px; display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
  .tag { font-size: 11px; border: 1px solid var(--axis); border-radius: 999px; padding: 0 7px; color: var(--ink2); }
</style>
