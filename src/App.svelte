<script lang="ts">
  import { onMount } from 'svelte'
  import About from './components/About.svelte'
  import Nav from './components/Nav.svelte'
  import { buildIndex } from './lib/data/index.ts'
  import SuggestEdit from './components/SuggestEdit.svelte'
  import { assembleDataset } from './lib/data/assemble.ts'
  import { loadFiles } from './lib/data/load.ts'
  import { initLang } from './lib/i18n.svelte.ts'
  import { router, startRouter } from './lib/router.svelte.ts'
  import Data from './views/Data.svelte'
  import Guess from './views/Guess.svelte'
  import Origins from './views/Origins.svelte'
  import Overview from './views/Overview.svelte'
  import People from './views/People.svelte'
  import Person from './views/Person.svelte'
  import Questions from './views/Questions.svelte'

  initLang()
  const files = loadFiles()
  const idx = buildIndex(assembleDataset(files))
  onMount(() => startRouter())
  const route = $derived(router.route)
</script>

<Nav {route} />
<main data-route={route.name}>
  {#if route.name === 'overview'}
    <Overview {idx} age={route.age} dim={route.dim} people={route.people} />
  {:else if route.name === 'person'}
    {#if route.id}{#key route.id}<Person {idx} id={route.id} />{/key}{:else}<People {idx} />{/if}
  {:else if route.name === 'guess'}
    <Guess {idx} />
  {:else if route.name === 'data'}
    <Data {idx} />
  {:else if route.name === 'questions'}
    <Questions {idx} film={route.film} person={route.person} theme={route.theme} q={route.q} open={route.open} />
  {:else}
    <Origins {idx} />
  {/if}
</main>
<About />
<SuggestEdit {idx} {files} />
