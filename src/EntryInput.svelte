<script>
  export let entryId,
    entryValue,
    nodeCursorEntryId,
    nodeCursorColId,
    isEntryAbove,
    isEntryBelow;
  export let handleSaveNodeEntry, handleSaveFullCursor;
  export let handleGoUp,
    handleGoDown,
    handleEntryBackspace,
    handleSplitEntry,
    handleIndent,
    handleDedent,
    handleSaveCursorColId;

  import { afterUpdate, tick } from "svelte";

  let theInput;

  afterUpdate(async () => {
    let nni = document.getElementById("node-name-input");
    if (document.activeElement === nni) {
      return;
    }

    if (theInput) {
      // take focus if id equals current row id
      if (
        entryId === nodeCursorEntryId &&
        document.activeElement !== theInput
      ) {
        theInput.focus();
      }
      // select all classes entry-input
      if (entryId === nodeCursorEntryId) {
        theInput.setSelectionRange(nodeCursorColId, nodeCursorColId);
      }
    }
  });

  function handleCursorMove(colId, entryValueSize) {
    let newColId = colId;

    switch (event.key) {
      case "ArrowLeft":
        newColId = Math.max(0, colId - 1);
        break;
      case "ArrowRight":
        newColId = Math.min(entryValueSize, colId + 1);
        break;
      case "Home":
        newColId = 0;
        break;
      case "End":
        newColId = entryValueSize;
        break;
    }

    handleSaveCursorColId(newColId);
  }

  async function handleKeydown(ev) {
    if (ev.key === "Tab") {
      ev.preventDefault();

      if (ev.shiftKey) {
        console.log( "TODO: do something on shift tab");
        handleDedent();
      } else {
        handleIndent();
      }
      return;
    }

    if (ev.key === "ArrowUp") {
      ev.preventDefault();
      if (isEntryAbove) {
        handleGoUp();
      }
    } else if (ev.key === "ArrowDown") {
      ev.preventDefault();
      if (isEntryBelow) {
        handleGoDown();
      }
    } else if (ev.key === "Backspace") {
      ev.preventDefault();
      handleEntryBackspace();
    } else if (ev.key === "Enter") {
      ev.preventDefault();
      handleSplitEntry();
    } else if (
      ["ArrowLeft", "ArrowRight", "Home", "End"].indexOf(ev.key) > -1
    ) {
      ev.preventDefault();

      handleCursorMove(this.selectionStart, this.value.length);
    } else {
      return;
    }
    await tick();
    this.selectionStart = nodeCursorColId;
    this.selectionEnd = nodeCursorColId;
  }

  $: handleEntryInputClick = (index, ev) => {
    let colId = ev.target.selectionStart;
    if (nodeCursorEntryId !== index || nodeCursorColId != colId) {
      handleSaveFullCursor(index, colId);
    }
  };

  $: handleInput = ev => {
    let colId = ev.target.selectionStart;
    let entryText = ev.target.value;
    handleSaveNodeEntry(entryText, colId);
  };
</script>

<style>
  .entry-input {
    margin: 0;
    padding: 0;
    border: 0;
    width: 100%;
  }
  .highlighted {
    background-color: #e6fcf1;
  }
</style>

<input
  type="text"
  class="entry-input"
  class:highlighted={entryId === nodeCursorEntryId}
  value={entryValue}
  bind:this={theInput}
  on:input={handleInput}
  on:click={e => handleEntryInputClick(entryId, e)}
  on:keydown={handleKeydown} />
