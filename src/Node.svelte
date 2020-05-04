<script>
  export let entries, nodeName, nodeCursorRowId, nodeCursorColId, nodeIsEditingName;
  export let handleStartEditingNodeName, handleCancelEditingNodeName, handleSaveNodeName;
  export let handleSaveNodeEntry;
  import { afterUpdate } from 'svelte';

  let nodeNameText = nodeName;
  let nodeEntryText = entries[nodeCursorRowId];
  let currCursorId = nodeCursorRowId;

  afterUpdate(() => {
    let el = document.getElementById("text-input");
    let nni = document.getElementById("node-name-input");
    if (document.activeElement !== el && document.activeElement !== nni) {
      el.focus();
      el.setSelectionRange(nodeCursorColId, nodeCursorColId);
    }
  });

  $: handleSaveName = () => handleSaveNodeName(nodeNameText);

  $: if (currCursorId !== nodeCursorRowId) {
    nodeEntryText = entries[nodeCursorRowId];
    currCursorId = nodeCursorRowId;
  }

  $: if (entries[nodeCursorRowId] !== nodeEntryText) {
    handleSaveNodeEntry(nodeEntryText);
  }

  $: handleEditingCancel = () => {
    nodeNameText = nodeName;
    handleCancelEditingNodeName();
  };

  $: handleStartEditing = () => {
    nodeNameText = nodeName;
    handleStartEditingNodeName();
  }

  $: atFirst = nodeCursorRowId === 0;
  $: atLast = nodeCursorRowId === entries.length - 1;

</script>

<style>
  .node-name-edit-action {
    cursor: pointer;
  }
  .node-name-edit-action:hover {
    text-decoration: underline;
  }

  #node-name {
    margin: 0.2em 0;
  }

  #node-name-display {
    font-size: 1.2em;
    font-weight: bold;
  }
  #node-name-edit {
    margin-left: 1em;
    margin-top: 0.5em;
    display: inline-block;
    font-size: 0.75em;
    cursor: pointer;
  }
  #node-name-edit:hover {
    text-decoration: underline;
  }

  #node-name-input {
    margin: 0;
    padding: 0.2em 0;
    border: 0;
    font-size: 1.2em;
    font-weight: bold;
    background-color: #f7f7f2;
  }


  #entries {
    font-family: Consolas, "Andale Mono WT", "Andale Mono", "Lucida Console", "Lucida Sans Typewriter", "DejaVu Sans Mono", "Bitstream Vera Sans Mono", "Liberation Mono", "Nimbus Mono L", Monaco, "Courier New", Courier, monospace;
    font-size: 1em;
  }

  .highlighted {
    background-color: #e6fcf1;
  }

  #text-input {
    margin: 0;
    padding: 0;
    border: 0;
    background-color: #e6fcf1;
    width: 100%;
  }
</style>

{#if nodeIsEditingName}
  <div>
    <input type="text" id="node-name-input" bind:value={nodeNameText} placeholder="Document name"/>
    <span class="node-name-edit-action" on:click={handleSaveName}>save</span>
    <span class="node-name-edit-action" on:click={handleEditingCancel}>cancel</span>
  </div>
{:else}
  <div id="node-name">
    <span id="node-name-display">{nodeName}</span>
    <span id="node-name-edit" on:click={handleStartEditing}>edit</span>
  </div>
{/if}

<ul id="entries">
{#each entries as entry, i}
  <li class={i === nodeCursorRowId ? "highlighted" : ""}>
    {#if i === nodeCursorRowId}
      <input type="text" id="text-input" bind:value={nodeEntryText} />
    {:else}
      <span>{entry}</span>
    {/if}
  </li>
{/each}
</ul>
