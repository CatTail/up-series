<script lang="ts">
  import { onMount } from 'svelte'
  import About from './components/About.svelte'
  import Nav from './components/Nav.svelte'
  import { buildIndex } from './lib/data/index.ts'
  import { loadDataset } from './lib/data/load.ts'
  import { initLang } from './lib/i18n.svelte.ts'
  import { router, startRouter } from './lib/router.svelte.ts'
  import Compare from './views/Compare.svelte'
  import Guess from './views/Guess.svelte'
  import Origins from './views/Origins.svelte'
  import Overview from './views/Overview.svelte'
  import Person from './views/Person.svelte'
  import Questions from './views/Questions.svelte'

  initLang()
  const idx = buildIndex(loadDataset())
  onMount(() => startRouter())
  const route = $derived(router.route)
</script>

<Nav {route} />
<main data-route={route.name}>
  {#if route.name === 'overview'}
    <Overview {idx} age={route.age} />
  {:else if route.name === 'person'}
    {#key route.id}<Person {idx} id={route.id} />{/key}
  {:else if route.name === 'guess'}
    <Guess {idx} />
  {:else if route.name === 'questions'}
    <Questions {idx} film={route.film} person={route.person} theme={route.theme} q={route.q} open={route.open} />
  {:else if route.name === 'compare'}
    <Compare {idx} a={route.a} b={route.b} />
  {:else}
    <Origins {idx} />
  {/if}
</main>
<About />
