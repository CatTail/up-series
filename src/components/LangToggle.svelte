<script lang="ts">
  import { i18n, setLang, t } from '../lib/i18n.svelte.ts'
</script>

<div class="lang" role="group" aria-label={t('lang.toggle')}>
  <button type="button" aria-pressed={i18n.lang === 'zh'} onclick={() => setLang('zh')}>中</button>
  <button type="button" aria-pressed={i18n.lang === 'en'} onclick={() => setLang('en')}>EN</button>
</div>

<style>
  .lang { display: flex; border: 1px solid var(--axis); border-radius: 999px; overflow: hidden; font-size: 12px; }
  button { border: 0; background: transparent; color: var(--ink2); padding: 2px 10px; cursor: pointer; font: inherit; }
  button[aria-pressed='true'] { background: var(--ink); color: var(--surface); }
</style>
