<script>
  export let entries, nodeCursorId, goUp;

  $: highlightedEntries = entries.map((entry, i) => {
    console.log("for i = ", i, ", entry = ", entry);
    return {
      entry: entry,
      highlighted: i === nodeCursorId
    };
  });

</script>

<style>
  #entries {
    font-family: Consolas, "Andale Mono WT", "Andale Mono", "Lucida Console", "Lucida Sans Typewriter", "DejaVu Sans Mono", "Bitstream Vera Sans Mono", "Liberation Mono", "Nimbus Mono L", Monaco, "Courier New", Courier, monospace;
    font-size: 1em;
  }

  .highlighted {
    background-color: #f3ffff
  }
</style>

<p>{nodeCursorId}</p>

<button disabled={nodeCursorId == 0} on:click={goUp}>up</button>

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
