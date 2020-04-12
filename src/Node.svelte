<script>
  export let entries, nodeName, nodeCursorId, nodeIsEditingName;

  let nodeText = nodeName;

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
  #node-name {
    font-size: 1.2em;
  }
  #entries {
    font-family: Consolas, "Andale Mono WT", "Andale Mono", "Lucida Console", "Lucida Sans Typewriter", "DejaVu Sans Mono", "Bitstream Vera Sans Mono", "Liberation Mono", "Nimbus Mono L", Monaco, "Courier New", Courier, monospace;
    font-size: 1em;
  }

  .highlighted {
    background-color: #F0FCF4;
  }
</style>

{#if nodeIsEditingName}
  <div>
    <input type="text" bind:value={nodeText} placeholder="Document name"/>
    <button>Save</button>
    <button>Cancel</button>
  </div>
{:else}
  <h1 id="node-name">{nodeName}</h1>
{/if}

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
