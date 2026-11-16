<script lang="ts">
  import { t } from '../lib/i18n.svelte.ts'
  import type { Route } from '../lib/route.ts'
  import LangToggle from './LangToggle.svelte'

  let { route }: { route: Route } = $props()
  const tabs = ['origins', 'overview', 'person', 'guess', 'questions', 'data'] as const
  const active = $derived(route.name)
</script>

<header class="bar">
  <a class="brand" href="#/origins">{t('nav.brand')}</a>
  <nav aria-label="main">
    {#each tabs as tab (tab)}
      <a href={`#/${tab}`} data-tab={tab} aria-current={active === tab ? 'page' : undefined}>{t(`nav.${tab}`)}</a>
    {/each}
  </nav>
  <LangToggle />
</header>

<style>
  .bar { display: flex; align-items: center; gap: 20px; padding: 10px 20px; border-bottom: 1px solid var(--grid); background: var(--surface); position: sticky; top: 0; z-index: 10; flex-wrap: wrap; }
  .brand { font-weight: 700; color: var(--ink); text-decoration: none; }
  nav { display: flex; gap: 16px; flex: 1; flex-wrap: wrap; }
  nav a { color: var(--ink2); text-decoration: none; padding: 2px 0; border-bottom: 2px solid transparent; }
  nav a[aria-current='page'] { color: var(--ink); font-weight: 600; border-bottom-color: var(--ink); }
  nav a:hover { color: var(--ink); }
</style>
