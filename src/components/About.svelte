<script lang="ts">
  import { t } from '../lib/i18n.svelte.ts'
</script>

<footer class="about">
  <h2>{t('about.title')}</h2>
  <p>{t('about.purpose')}</p>
  <p>{t('about.sources')}</p>
  <p>{t('about.copyright')}</p>
  <p>{t('about.translation')}</p>
  <p>{t('about.gaps')}</p>
</footer>

<style>
  .about { max-width: 1080px; margin: 0 auto; padding: 18px 20px 40px; border-top: 1px solid var(--grid); color: var(--ink2); font-size: 12px; }
  h2 { font-size: 13px; margin: 0 0 6px; color: var(--ink); }
  p { margin: 0 0 6px; max-width: 60em; }
</style>
