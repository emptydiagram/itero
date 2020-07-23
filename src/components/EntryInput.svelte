<script>
  export let entryId,
    entryValue,
    entryHeadingSize,
    docCursorEntryId,
    docCursorSelStart,
    docCursorSelEnd,
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
    handleMoveCursorLeft,
    handleMoveCursorRight,
    handleSaveCursorPos,
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
        theInput.setSelectionRange(docCursorSelStart, docCursorSelEnd);
      }
    }
  });

  function handleCursorMove(event, colId, entryValueSize) {
    switch (event.key) {
      case "ArrowLeft":
        handleMoveCursorLeft();
        return;
      case "ArrowRight":
        handleMoveCursorRight(entryValueSize);
        return;
      case "Home":
        handleSaveCursorPos(0);
        return;
      case "End":
        handleSaveCursorPos(entryValueSize);
        return;
    }
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
      handleEntryBackspace();
    } else if (ev.key === "Enter") {
      ev.preventDefault();
      handleSplitEntry();
    } else if (
      ["ArrowLeft", "ArrowRight", "Home", "End"].indexOf(ev.key) > -1
    ) {
      ev.preventDefault();

      handleCursorMove(ev, this.selectionStart, this.value.length);
    } else if (ev.key == "H" && ev.ctrlKey && ev.shiftKey) {
      ev.preventDefault();
      handleCycleEntryHeadingSize(entryId);
    } else {
      return;
    }
    await tick();
    this.selectionStart = docCursorSelStart;
    this.selectionEnd = docCursorSelEnd;
  }

  function handleEntryInputClick(index, ev) {
    let newSelStart = ev.target.selectionStart;
    let newSelEnd = ev.target.selectionEnd;
    if (docCursorEntryId !== index || docCursorSelStart != newSelStart || docCursorSelEnd != newSelEnd) {
      handleSaveFullCursor(index, newSelStart, newSelEnd);
    }
  }

  function handleInput(ev) {
    let entryText = ev.target.value;
    handleSaveDocEntry(entryText, ev.target.selectionStart, ev.target.selectionEnd);
  }

  function handlePaste(ev) {
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
    font-weight: bold;
    margin: 0.04em 0;
  }

  .heading-2 {
    font-size: 1.13em;
    font-weight: bold;
    margin: 0.02em 0;
  }

  .heading-3 {
    font-size: 1.06em;
    font-weight: bold;
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
