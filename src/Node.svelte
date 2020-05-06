<script>
  export let entries, nodeTitle, nodeEntry, nodeCursorRowId, nodeCursorColId, nodeIsEditingName;
  export let handleStartEditingNodeName, handleCancelEditingNodeName, handleSaveNodeName;
  export let handleSaveNodeEntry, handleSaveFullCursor, handleSaveCursorColId;
  import { afterUpdate } from 'svelte';

  let nodeTitleText = nodeTitle;
  let nodeEntryText = nodeEntry;
  let currCursorRowId = nodeCursorRowId;

  afterUpdate(() => {
    let el = document.getElementById("text-input");
    let nni = document.getElementById("node-name-input");
    if (document.activeElement !== el && document.activeElement !== nni) {
      el.focus();
      el.setSelectionRange(nodeCursorColId, nodeCursorColId);
    }
  });

  // user moved to another row
  // TODO: this should be done in an action, because context has to be updated
  // this is a hack. I need to figure out
  $: if (currCursorRowId !== nodeCursorRowId) {
    nodeEntryText = nodeEntry;
    currCursorRowId = nodeCursorRowId;
  }

  // if nodeEntryText, which tracks the value in the <input>, no longer matches
  // the entry, then update the entry
  $: if (entries[nodeCursorRowId] !== nodeEntryText) {
    handleSaveNodeEntry(nodeEntryText);
  }

  $: handleSaveName = () => handleSaveNodeName(nodeTitleText);

  $: handleEditingCancel = () => {
    nodeTitleText = nodeTitle;
    handleCancelEditingNodeName();
  };

  $: handleStartEditing = () => {
    nodeTitleText = nodeTitle;
    handleStartEditingNodeName();
  }

  $: handleMoveClick = (index, event) => {
    handleSaveFullCursor(index, event.target.selectionStart);
  }

  $: handleInput = (ev) => {
    let colId = ev.target.selectionStart;
    if (colId !== nodeCursorColId) {
      handleSaveCursorColId(colId);
    }
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
    background-color: #e6fcf1;
  }

  .entry-input {
    margin: 0;
    padding: 0;
    border: 0;
    width: 100%;
  }
</style>

{#if nodeIsEditingName}
  <div>
    <input type="text" id="node-name-input" bind:value={nodeTitleText} placeholder="Document name"/>
    <span class="node-name-edit-action" on:click={handleSaveName}>save</span>
    <span class="node-name-edit-action" on:click={handleEditingCancel}>cancel</span>
  </div>
{:else}
  <div id="node-name">
    <span id="node-name-display">{nodeTitle}</span>
    <span id="node-name-edit" on:click={handleStartEditing}>edit</span>
  </div>
{/if}

<ul id="entries">
{#each entries as entry, i}
  <li class={i === nodeCursorRowId ? "highlighted" : ""}>
    {#if i === nodeCursorRowId}
      <input type="text" id="text-input" class="entry-input" on:input={handleInput} bind:value={nodeEntryText} />
    {:else}
      <input type="text" class="entry-input" value={entry} on:click={(e) => handleMoveClick(i, e)} />
    {/if}
  </li>
{/each}
</ul>
