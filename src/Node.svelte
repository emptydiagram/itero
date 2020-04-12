<script>
  export let entries, nodeCursorId;

  $: highlightedEntries = entries.map((entry, i) => {
    return {
      entry: entry,
      highlighted: i === nodeCursorId
    };
  });

  $: atFirst = nodeCursorId === 0;
  $: atLast = nodeCursorId === entries.length - 1;

</script>

<style>
  #entries {
    font-family: Consolas, "Andale Mono WT", "Andale Mono", "Lucida Console", "Lucida Sans Typewriter", "DejaVu Sans Mono", "Bitstream Vera Sans Mono", "Liberation Mono", "Nimbus Mono L", Monaco, "Courier New", Courier, monospace;
    font-size: 1em;
  }

  .highlighted {
    background-color: #F0FCF4;
  }
</style>


<ul id="entries">
{#each highlightedEntries as hlEntry, i}
    {#if hlEntry.highlighted}
      <li class="highlighted">{hlEntry.entry}</li>
    {:else}
      <li>{hlEntry.entry}</li>
    {/if}
{/each}
</ul>


<a href="#/">go back</a>
