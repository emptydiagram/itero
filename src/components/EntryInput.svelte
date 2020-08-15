<script lang="ts">
  export let entryId: number,
    entryValue: string,
    entryHeadingSize: number,
    docCursorEntryId: number | null,
    docCursorSelStart: number | null,
    docCursorSelEnd: number | null,
    isEntryAbove: boolean,
    isEntryBelow: boolean,
    handleGoUp: () => void,
    handleGoDown: () => void,
    handleEntryBackspace: () => void,
    handleCollapseEntry: (entryId: number, shouldDefocus?: boolean) => void,
    handleExpandEntry: (entryId: number, shouldDefocus?: boolean) => void,
    handleSplitEntry: () => void,
    handleIndent: () => void,
    handleDedent: () => void,
    handleMultilinePaste: (text: string) => void,
    handleMoveCursorLeft: (entryTextLength: number) => void,
    handleMoveCursorRight: (entryTextLength: number) => void,
    handleSaveCursorPos: (pos: number) => void,
    handleSaveDocEntry: (entryText: string, selStart: number, selEnd: number) => void,
    handleSaveFullCursor: (entryId: number, selStart: number, selEnd: number) => void,
    handleSwapWithAboveEntry: (entryId: number) => void,
    handleSwapWithBelowEntry: (entryId: number) => void,
    handleCycleEntryHeadingSize: (entryId: number) => void;

  import { afterUpdate, tick } from "svelte";

  let theInput: any;

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

  function handleCursorMove(event: KeyboardEvent, entryValueSize: number) {
    switch (event.key) {
      case "ArrowLeft":
        handleMoveCursorLeft(entryValueSize);
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

  async function handleKeydown(ev: KeyboardEvent) {
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

      handleCursorMove(ev, this.value.length);
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

  function handleEntryInputClick(ev: Event, entryId: number) {
    let target: HTMLInputElement = ev.target as HTMLInputElement;
    let newSelStart = target.selectionStart;
    let newSelEnd = target.selectionEnd;
    if (docCursorEntryId !== entryId || docCursorSelStart != newSelStart || docCursorSelEnd != newSelEnd) {
      handleSaveFullCursor(entryId, newSelStart, newSelEnd);
    }
  }

  function handleInput(ev: Event) {
    let target: HTMLInputElement = ev.target as HTMLInputElement;
    let entryText = target.value;
    handleSaveDocEntry(entryText, target.selectionStart, target.selectionEnd);
  }

  function handlePaste(ev: ClipboardEvent) {
    let pastedText = (ev.clipboardData || (window as any).clipboardData).getData('text');
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
    font-size: 1.28em;
    font-weight: bold;
    margin: 0.04em 0;
  }

  .heading-2 {
    font-size: 1.21em;
    font-weight: bold;
    margin: 0.02em 0;
  }

  .heading-3 {
    font-size: 1.13em;
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
  on:click={e => handleEntryInputClick(e, entryId)}
  on:keydown={handleKeydown}
  on:paste={handlePaste}
  data-testid="entry-input"
/>
