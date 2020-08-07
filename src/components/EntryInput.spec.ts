import EntryInput from './EntryInput.svelte'
import { render, fireEvent } from '@testing-library/svelte'

it('it renders plain text', async () => {
  let props = {
    entryId: 123,
    entryValue: 'hello, friend',
    entryHeadingSize: 0,
    docCursorEntryId: 123,
    docCursorSelStart: 2,
    docCursorSelEnd: 5,
    isEntryAbove: false,
    isEntryBelow: false,
    handleGoUp: null,
    handleGoDown: null,
    handleEntryBackspace: null,
    handleCollapseEntry: null,
    handleExpandEntry: null,
    handleSplitEntry: null,
    handleIndent: null,
    handleDedent: null,
    handleMultilinePaste: null,
    handleMoveCursorLeft: null,
    handleMoveCursorRight: null,
    handleSaveCursorPos: null,
    handleSaveDocEntry: null,
    handleSaveFullCursor: null,
    handleSwapWithAboveEntry: null,
    handleSwapWithBelowEntry: null,
    handleCycleEntryHeadingSize: null,
  };

  const { getByTestId } = render(EntryInput, props);

  const entryInput: HTMLInputElement = getByTestId('entry-input') as HTMLInputElement;

  expect(entryInput.value).toBe(props.entryValue);
  expect(entryInput.selectionStart).toBe(props.docCursorSelStart);
  expect(entryInput.selectionEnd).toBe(props.docCursorSelEnd);

});


it('it moves left', async () => {
  let moveLeftCalled = false;
  let props = {
    entryId: 123,
    entryValue: 'hello, friend',
    entryHeadingSize: 0,
    docCursorEntryId: 123,
    docCursorSelStart: 3,
    docCursorSelEnd: 3,
    isEntryAbove: false,
    isEntryBelow: false,
    handleGoUp: null,
    handleGoDown: null,
    handleEntryBackspace: null,
    handleCollapseEntry: null,
    handleExpandEntry: null,
    handleSplitEntry: null,
    handleIndent: null,
    handleDedent: null,
    handleMultilinePaste: null,
    handleMoveCursorLeft: () => {
      moveLeftCalled = true;
    },
    handleMoveCursorRight: null,
    handleSaveCursorPos: null,
    handleSaveDocEntry: null,
    handleSaveFullCursor: null,
    handleSwapWithAboveEntry: null,
    handleSwapWithBelowEntry: null,
    handleCycleEntryHeadingSize: null,
  };

  const { getByTestId } = render(EntryInput, props);

  const entryInput: HTMLInputElement = getByTestId('entry-input') as HTMLInputElement;

  expect(entryInput.value).toBe(props.entryValue);

  expect(entryInput.selectionStart).toBe(props.docCursorSelStart);
  expect(entryInput.selectionEnd).toBe(props.docCursorSelEnd);

  expect(entryInput).toHaveFocus();

  await fireEvent.keyDown(entryInput, {
    key: 'ArrowLeft',
    code: 'ArrowLeft'
  });

  expect(moveLeftCalled).toBe(true);

});