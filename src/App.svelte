<script lang="ts">
  import { onMount } from 'svelte'
  import Nav from './components/Nav.svelte'
  import { buildIndex } from './lib/data/index.ts'
  import { loadDataset } from './lib/data/load.ts'
  import { initLang, t } from './lib/i18n.svelte.ts'
  import { router, startRouter } from './lib/router.svelte.ts'
  import Overview from './views/Overview.svelte'

  initLang()
  const idx = buildIndex(loadDataset())
  onMount(() => startRouter())
  const route = $derived(router.route)
</script>

<Nav {route} />
<main data-route={route.name}>
  {#if false}
  {:else if route.name === 'overview'}
    <Overview {idx} age={route.age} />
  {:else}
    <h1 class="placeholder">{t(`nav.${route.name}`)}</h1>
  {/if}
</main>
