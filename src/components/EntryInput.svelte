<script>
  export let entryId,
    entryValue,
    entryHeadingSize,
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
    handleMultilinePaste,
    handleSaveCursorColId,
    handleSaveDocEntry,
    handleSaveFullCursor,
    handleSwapWithAboveEntry,
    handleSwapWithBelowEntry,
    handleCycleEntryHeadingSize;

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
        handleCollapseEntry(entryId);
      } else if (ev.shiftKey && ev.altKey) {
        handleSwapWithAboveEntry(entryId);
      } else {
        if (isEntryAbove) {
          handleGoUp();
        }
      }
    } else if (ev.key === "ArrowDown") {
      ev.preventDefault();

      if (ev.ctrlKey) {
        // TODO: Guard?
        handleExpandEntry(entryId);
      } else if (ev.shiftKey && ev.altKey) {
        handleSwapWithBelowEntry(entryId);
      } else {
        if (isEntryBelow) {
          handleGoDown();
        }
      }
    } else if (ev.key === "Backspace") {
      ev.preventDefault();
      if (ev.target.selectionStart !== ev.target.selectionEnd) {
        handleEntryBackspace(ev.target.selectionStart, ev.target.selectionEnd);
      } else {
        handleEntryBackspace();
      }
    } else if (ev.key === "Enter") {
      ev.preventDefault();
      handleSplitEntry();
    } else if (
      ["ArrowLeft", "ArrowRight", "Home", "End"].indexOf(ev.key) > -1
    ) {
      ev.preventDefault();

      handleCursorMove(this.selectionStart, this.value.length);
    } else if (ev.key == "H") {
      ev.preventDefault();
      if (ev.ctrlKey && ev.shiftKey) {
        handleCycleEntryHeadingSize(entryId);
      }
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
    console.log("EntryInput, input event");
    let colId = ev.target.selectionStart;
    let entryText = ev.target.value;
    handleSaveDocEntry(entryText, colId);
  };

  $: handlePaste = ev => {
    let pastedText = (ev.clipboardData || window.clipboardData).getData('text');
    let pastedLines = pastedText.split('\n');
    if (pastedLines.length > 1) {
      ev.preventDefault();
      handleMultilinePaste(pastedText);
    }
  }
</script>

<style>
  .entry-input {
    margin: 0;
    padding: 0;
    /* FIXME: this is a load-bearing border for a minor layout issue */
    border: 1px solid rgba(1.0, 1.0, 1.0, 0.0);
    width: 100%;
  }
  .highlighted {
    background-color: #e6fcf1;
  }

  .heading-1 {
    font-size: 1.2em;
    font-weight: 800;
    margin: 0.04em 0;
  }

  .heading-2 {
    font-size: 1.13em;
    font-weight: 700;
    margin: 0.02em 0;
  }

  .heading-3 {
    font-size: 1.06em;
    font-weight: 600;
    margin: 0.01em 0;
  }

  .heading-0 {
    font-size: 1em;
  }
</style>

<input
  type="text"
  class={`entry-input heading-${entryHeadingSize}`}
  class:highlighted={entryId === docCursorEntryId}
  value={entryValue}
  bind:this={theInput}
  on:input={handleInput}
  on:click={e => handleEntryInputClick(entryId, e)}
  on:keydown={handleKeydown}
  on:paste={handlePaste} />
