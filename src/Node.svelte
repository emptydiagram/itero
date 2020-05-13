<script>
  export let entries, nodeTitle, nodeCursorRowId, nodeCursorColId, nodeIsEditingName;
  export let handleStartEditingNodeName, handleCancelEditingNodeName, handleSaveNodeName;
  export let handleSaveNodeEntry, handleSaveFullCursor;
  import { afterUpdate } from 'svelte';

  let nodeTitleText = nodeTitle;

  let textInputs = new Array(10);

  afterUpdate(() => {
    let nni = document.getElementById("node-name-input");
    // let textInput = document.getElementById("text-input");
    let textInput = textInputs[nodeCursorRowId];
    if (document.activeElement === textInput
        || (document.activeElement !== textInput && document.activeElement !== nni)) {
      if (document.activeElement !== textInput) {
        console.log("  afterUpdat, STEALING FOCUS!");
        textInput.focus();
      }
      textInput.setSelectionRange(nodeCursorColId, nodeCursorColId);

    }
  });


  $: handleSaveName = () => handleSaveNodeName(nodeTitleText);

  $: handleEditingCancel = () => {
    nodeTitleText = nodeTitle;
    handleCancelEditingNodeName();
  };

  $: handleStartEditing = () => {
    nodeTitleText = nodeTitle;
    handleStartEditingNodeName();
  }

  $: handleEntryInputClick = (index, event) => {
    let colId = event.target.selectionStart;
    if (nodeCursorRowId !== index || nodeCursorColId != colId) {
      handleSaveFullCursor(index, colId);
    }
  }

  $: handleInput = (ev) => {
    let colId = ev.target.selectionStart;
    let entryText = ev.target.value;
    handleSaveNodeEntry(entryText, colId);
  }

  $: atFirst = nodeCursorRowId === 0;
  $: atLast = nodeCursorRowId === entries.length - 1;

</script>

<style>
  .node-name-edit-action {
    cursor: pointer;
    text-decoration: underline;
  }
  .node-name-edit-action:active {
    color: rgb(0,80,160);
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
    <input
      type="text"
      class="entry-input"
      value={entry}
      bind:this={textInputs[i]}
      on:input={handleInput}
      on:click={(e) => handleEntryInputClick(i, e)}
    />
  </li>
{/each}
</ul>
