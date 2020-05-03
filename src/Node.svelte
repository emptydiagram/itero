<script>
  export let entries, nodeName, nodeCursorId, nodeIsEditingName;
  export let handleStartEditingNodeName, handleCancelEditingNodeName, handleSaveNodeName;
  import { afterUpdate } from 'svelte';

  let nodeText = nodeName;

  afterUpdate(() => {
    let el = document.getElementById("text-input");
    if (document.activeElement !== el) {
      el.focus();
      el.setSelectionRange(0, 0);
    }
  });

  $: handleSave = () => handleSaveNodeName(nodeText);

  $: handleEditingCancel = () => {
    nodeText = nodeName;
    handleCancelEditingNodeName();
  };

  $: handleStartEditing = () => {
    nodeText = nodeName;
    handleStartEditingNodeName();
  }

  $: atFirst = nodeCursorId === 0;
  $: atLast = nodeCursorId === entries.length - 1;

</script>

<style>
  #node-name {
    font-size: 1.2em;
    font-weight: bold;
  }
  #node-name-edit {
    margin-left: 1em;
    margin-top: 0.5em;
    display: inline-block;
    font-size: 0.75em;
    cursor: default;
  }
  #node-name-edit:hover {
    text-decoration: underline;
  }
  #entries {
    font-family: Consolas, "Andale Mono WT", "Andale Mono", "Lucida Console", "Lucida Sans Typewriter", "DejaVu Sans Mono", "Bitstream Vera Sans Mono", "Liberation Mono", "Nimbus Mono L", Monaco, "Courier New", Courier, monospace;
    font-size: 1em;
  }

  .highlighted {
    background-color: #F3FCF6;
  }

  #text-input {
    margin: 0;
    padding: 0;
    border: 0;
    background-color: #F3FCF6;
  }
</style>

{#if nodeIsEditingName}
  <div>
    <input type="text" bind:value={nodeText} placeholder="Document name"/>
    <button on:click={handleSave}>Save</button>
    <button on:click={handleEditingCancel}>Cancel</button>
  </div>
{:else}
  <div>
    <span id="node-name">{nodeName}</span>
    <span id="node-name-edit" on:click={handleStartEditing}>edit</span>
  </div>
{/if}

<ul id="entries">
{#each entries as entry, i}
  <li class={i === nodeCursorId ? "highlighted" : ""}>
    {#if i === nodeCursorId}
      <input type="text" id="text-input" value={entry} />
    {:else}
      <span>{entry}</span>
    {/if}
  </li>
{/each}
</ul>


<a href="#/">go back</a>
