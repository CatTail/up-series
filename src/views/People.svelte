<script lang="ts">
  import PersonStrip from '../components/PersonStrip.svelte'
  import type { DataIndex } from '../lib/data/index.ts'
  import { pick, t } from '../lib/i18n.svelte.ts'

  let { idx }: { idx: DataIndex } = $props()
  const groups = $derived(idx.groups.map((g) => ({ g, people: idx.peopleOrdered.filter((p) => p.group === g.id) })).filter((x) => x.people.length))
</script>

<section>
  <PersonStrip {idx} />
  <h1>{t('people.title')}</h1>
  <p class="lede">{t('people.lede')}</p>
  {#each groups as { g, people } (g.id)}
    <h2><i style:background={`var(${g.colorVar})`} aria-hidden="true"></i>{pick(g.name)}</h2>
    <div class="cards">
      {#each people as p (p.id)}
        {@const final = idx.final(p.id)}
        <a class="pcard" href={`#/person/${p.id}`}>
          <b>{p.fullName}</b>
          {#if p.born}<span class="tag">{t('person.born', { date: p.born })}</span>{/if}
          {#if p.died}<span class="tag">{t('person.died', { date: p.died })}</span>{/if}
          <span class="bg">{pick(p.background)}</span>
          <span class="fin">
            <span class="k">{t('person.final')}</span>
            {#if final}{pick(final.text)} <small>{t('person.finalAsOf', { title: idx.film(final.asOfFilmId).title })}</small>{:else}<span class="nf">{t('state.notFound')}</span>{/if}
          </span>
        </a>
      {/each}
    </div>
  {/each}
</section>

<style>
  h1 { font-size: 22px; margin: 0 0 2px; }
  .lede { color: var(--ink2); margin: 0 0 6px; font-size: 14px; }
  h2 { font-size: 14px; font-weight: 600; color: var(--ink2); margin: 16px 0 6px; }
  h2 i { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 8px; vertical-align: -1px; }
  .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 8px; }
  .pcard { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 6px; padding: 8px 10px; border: 1px solid var(--grid); border-radius: 8px; background: var(--surface); color: var(--ink); text-decoration: none; font-size: 13px; }
  .pcard:hover { border-color: var(--axis); }
  .pcard b { font-size: 14px; margin-right: 2px; }
  .tag { font-size: 11px; border: 1px solid var(--axis); border-radius: 999px; padding: 0 6px; color: var(--ink2); }
  .bg { flex-basis: 100%; color: var(--ink2); }
  .fin { flex-basis: 100%; }
  .k { display: block; font-size: 11px; color: var(--muted); }
  small, .nf { color: var(--muted); }
</style>
