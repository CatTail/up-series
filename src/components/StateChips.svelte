<script lang="ts">
  import type { DataIndex } from '../lib/data/index.ts'
  import type { GroupId } from '../lib/data/types.ts'
  import { chipSummary } from '../lib/states.ts'
  import CellText from './CellText.svelte'

  let { idx, filmIndex, highlight = null }: { idx: DataIndex; filmIndex: number; highlight?: GroupId | null } = $props()
  const film = $derived(idx.films[filmIndex])
</script>

<div class="chips">
  {#each idx.peopleOrdered as p (p.id)}
    {@const c = chipSummary(idx, p.id, film.id)}
    <a class="chip" class:off={c.kind === 'participation'} class:dim={highlight && highlight !== p.group} href={`#/person/${p.id}`} data-person={p.id}>
      <b><span class="dot" style:background={`var(${idx.group(p.group).colorVar})`}></span>{p.name}</b>
      <CellText cell={c} withNote={false} />
    </a>
  {/each}
</div>

<style>
  .chips { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; margin-top: 10px; }
  .chip { display: block; border: 1px solid var(--grid); border-radius: 8px; padding: 6px 9px; font-size: 12px; background: var(--surface); color: var(--ink); text-decoration: none; transition: opacity 0.15s; }
  .chip:hover { border-color: var(--axis); }
  .chip b { display: block; font-size: 13px; }
  .chip.off { background: var(--page); }
  .chip.dim { opacity: 0.35; }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
</style>
