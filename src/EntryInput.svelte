<script>
  export let entryId,
    entryValue,
    docCursorEntryId,
    docCursorColId,
    isEntryAbove,
    isEntryBelow;
  export let handleGoUp,
    handleGoDown,
    handleEntryBackspace,
    handleCollapseEntry,
    handleExpandEntry,
    handleSplitEntry,
    handleIndent,
    handleDedent,
    handleSaveCursorColId,
    handleSaveDocEntry,
    handleSaveFullCursor;

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
        entryId === docCursorEntryId &&
        document.activeElement !== theInput
      ) {
        theInput.focus();
      }
      // select all classes entry-input
      if (entryId === docCursorEntryId) {
        theInput.setSelectionRange(docCursorColId, docCursorColId);
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
        handleDedent();
      } else {
        handleIndent();
      }
      return;
    }

    if (ev.key === "ArrowUp") {
      ev.preventDefault();

      if (ev.ctrlKey) {
        // TODO: Guard?
        handleCollapseEntry();
      } else {
        if (isEntryAbove) {
          handleGoUp();
        }
      }
    } else if (ev.key === "ArrowDown") {
      ev.preventDefault();

      if (ev.ctrlKey) {
        // TODO: Guard?
        handleExpandEntry();
      } else {
        if (isEntryBelow) {
          handleGoDown();
        }
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
    this.selectionStart = docCursorColId;
    this.selectionEnd = docCursorColId;
  }

  $: handleEntryInputClick = (index, ev) => {
    let colId = ev.target.selectionStart;
    if (docCursorEntryId !== index || docCursorColId != colId) {
      handleSaveFullCursor(index, colId);
    }
  };

  $: handleInput = ev => {
    let colId = ev.target.selectionStart;
    let entryText = ev.target.value;
    handleSaveDocEntry(entryText, colId);
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
  class:highlighted={entryId === docCursorEntryId}
  value={entryValue}
  bind:this={theInput}
  on:input={handleInput}
  on:click={e => handleEntryInputClick(entryId, e)}
  on:keydown={handleKeydown} />
