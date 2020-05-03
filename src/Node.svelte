<script>
  export let entries, nodeName, nodeCursorId, nodeIsEditingName;
  export let handleStartEditingNodeName, handleCancelEditingNodeName, handleSaveNodeName;
  import { afterUpdate } from 'svelte';

  let nodeText = nodeName;

  afterUpdate(() => {
    let el = document.getElementById("text-input");
    let nni = document.getElementById("node-name-input");
    if (document.activeElement !== el && document.activeElement !== nni) {
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
  }
</style>

{#if nodeIsEditingName}
  <div>
    <input type="text" id="node-name-input" bind:value={nodeText} placeholder="Document name"/>
    <span class="node-name-edit-action" on:click={handleSave}>save</span>
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
  <li class={i === nodeCursorId ? "highlighted" : ""}>
    {#if i === nodeCursorId}
      <input type="text" id="text-input" value={entry} />
    {:else}
      <span>{entry}</span>
    {/if}
  </li>
{/each}
</ul>
