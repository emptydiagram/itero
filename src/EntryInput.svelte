<script>
  export let entryId, entryValue, nodeCursorRowId, nodeCursorColId, atFirstRow, atLastRow;
  export let handleSaveNodeEntry, handleSaveFullCursor;
  export let handleGoUp, handleGoDown, handleEntryBackspace, handleSplitEntry;

  import { afterUpdate, tick } from 'svelte';

  let theInput;

  afterUpdate(async () => {
    let nni = document.getElementById("node-name-input");
    if (document.activeElement === nni) {
      return;
    }

    if (theInput) {
    // take focus if id equals current row id
      if (entryId === nodeCursorRowId && document.activeElement !== theInput) {
        theInput.focus();
      }
      // select all classes entry-input
      if (entryId === nodeCursorRowId) {
        console.log(" # current selectionStart = ", theInput.selectionStart);
        theInput.setSelectionRange(nodeCursorColId, nodeCursorColId);
        console.log(" # now selectionStart = ", theInput.selectionStart);
      }
    }
  });

  async function handleKeydown(ev) {
    if (ev.key === "ArrowUp") {
      ev.preventDefault();
      if (!atFirstRow) {
        handleGoUp();
      }
    } else if (ev.key === "ArrowDown") {
      ev.preventDefault();
      if (!atLastRow) {
        handleGoDown();
      }
    } else if (ev.key === "Backspace") {
      ev.preventDefault();
      handleEntryBackspace();
    } else if (ev.key === "Enter") {
      ev.preventDefault();
      handleSplitEntry();
    } else {
      return;
    }
    await tick();
    this.selectionStart = nodeCursorColId;
    this.selectionEnd = nodeCursorColId;
  }



  $: handleEntryInputClick = (index, ev) => {
    let colId = ev.target.selectionStart;
    if (nodeCursorRowId !== index || nodeCursorColId != colId) {
      console.log(" $$ handleEntryInputClick w/ (r, c) = (", index, colId, ")");
      handleSaveFullCursor(index, colId);
    }
  }

  $: handleInput = (ev) => {
    let colId = ev.target.selectionStart;
    let entryText = ev.target.value;
    console.log(" *~*~ handleInput w/ (colId, entryText) = (", colId, entryText, ")");
    handleSaveNodeEntry(entryText, colId);
  }

</script>

<style>
  .entry-input {
    margin: 0;
    padding: 0;
    border: 0;
    width: 100%;
  }
</style>

<input
  type="text"
  class="entry-input"
  value={entryValue}
  bind:this={theInput}
  on:input={handleInput}
  on:click={(e) => handleEntryInputClick(entryId, e)}
  on:keydown={handleKeydown}
/>
