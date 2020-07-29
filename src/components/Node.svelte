<script lang="ts">
  export let tree: FlowyTree,
    flowyTreeNode: FlowyTreeNode,
    docCursorEntryId,
    docCursorSelStart: number,
    docCursorSelEnd: number,
    findRelevantDocNames: (text: string) => string[],
    handleGoUp: () => void,
    handleGoDown: () => void,
    handleEntryBackspace: () => void,
    handleCollapseEntry: (entryId: number) => void,
    handleExpandEntry: (entryId: number) => void,
    handleSplitEntry: () => void,
    handleIndent: () => void,
    handleDedent: () => void,
    handleMultilinePaste,
    handleMoveCursorLeft: () => void,
    handleMoveCursorRight: (entryTextLength: number) => void,
    handleSaveCursorPos: (pos: number) => void,
    handleSaveDocEntry: (entryText: string, selStart: number, selEnd: number) => void,
    handleSaveFullCursor: (entryId: number, selStart: number, selEnd: number) => void,
    handleSwapWithAboveEntry: (entryId: number) => void,
    handleSwapWithBelowEntry: (entryId: number) => void,
    handleUpdateEntryLinks,
    handleCycleEntryHeadingSize;


  import Icon from 'svelte-awesome';
  import { faCircle,faPlus } from '@fortawesome/free-solid-svg-icons';

  import FlowyTree from '../FlowyTree';
  import FlowyTreeNode from '../FlowyTreeNode';
  import EntryInput from "./EntryInput.svelte";

  import { LinkedListItem } from "../LinkedList";
  import RenderedEntry from "./RenderedEntry.svelte";
  import Node from "./Node.svelte";
  import { EntryDisplayState } from "../data.ts";


  function nodeIsCollapsed(node): boolean {
    return node.hasChildren()
      && tree.getEntryDisplayState(node.getId()) === EntryDisplayState.COLLAPSED;
  }

  function handleToggle(entryId: number, isCollapsed: boolean) {
    if (isCollapsed) {
      handleExpandEntry(entryId);
    } else {
      handleCollapseEntry(entryId);
    }
  }

  let currEntryId: number | null;
  $: currEntryId = flowyTreeNode.getId();

  let childItemArray: Array<LinkedListItem>;
  $: childItemArray = flowyTreeNode.getChildNodeArray();

  let currNodeHasChildren: boolean;
  $: currNodeHasChildren = childItemArray.length > 0;

  let isCollapsed: boolean;
  $: isCollapsed = currNodeHasChildren
    && tree.getEntryDisplayState(currEntryId) == EntryDisplayState.COLLAPSED;

  let isCurrentEntry: boolean;
  $: isCurrentEntry = (currEntryId != null) && currEntryId === docCursorEntryId;



  // use entryValue and docCursorSelStart to see if cursor start is immediately after opening [[
  // TODO: move to a derived store?
  let autoCompleteDocNames: string[];
  $: autoCompleteDocNames = (function() {
    if (isCurrentEntry) {
      let entryValue = tree.getEntryText(currEntryId);
      let returnVal = entryValue && docCursorSelStart >= 2
        && entryValue.substring(docCursorSelStart - 2, docCursorSelStart) === "[["
        && !(docCursorSelStart > 2 && entryValue[docCursorSelStart - 3] === "\\");

      // check if there is a closing "]]". if yes, take the interior of [[...]],
      // if no, take to the end of the entry. use this to search the page title inverted
      // index.
      if (returnVal) {
        let closingBrackets = new RegExp('(?![\])]]');
        let entryAfterOpening = entryValue.substring(docCursorSelStart);
        let match = closingBrackets.exec(entryAfterOpening);
        let pageTitleText;
        if (match !== null) {
          pageTitleText = entryValue.substring(docCursorSelStart, docCursorSelStart + match.index);
        } else {
          pageTitleText = entryAfterOpening;
        }
        let relevantDocNames: string[] = findRelevantDocNames(pageTitleText);
        return relevantDocNames;
      }
    }
    return null;
  })()

  let shouldShowDocNameAutocomplete: boolean;
  $: shouldShowDocNameAutocomplete = autoCompleteDocNames !== null;
</script>

<style>
  .tree-node-list {
    display: block;
    padding-left: 1.8em;
    list-style-type: none;
    border-left: 1px dotted #999;
    margin-left: 0.2em;
  }

  .tree-node-list li {
    display: flex;
    flex-direction: column;
    line-height: 1.6em;
  }

  .entry-display {
    display: flex;
    flex-direction: row;
  }

  .icon-container {
    display: flex;
    justify-content: center;
    flex-direction: column;
    width: 1em;
    margin-right: 0.5em;
  }

  .icon-container:hover {
    cursor: pointer;
  }

  #doc-name-autocomplete {
    position: absolute;
    z-index: 5;
    margin-top: 1.75em;
    margin-left: 1.5em;
    background-color: #fff;
    width: 20em;
    padding: 0.5em;
    box-shadow: 3px 3px 5px #363636;
  }
</style>

{#if currEntryId !== null}
  <div class="entry-display" data-entry-id={currEntryId}>
    <span class="icon-container" on:click={() => handleToggle(currEntryId, nodeIsCollapsed(flowyTreeNode))}>
      {#if nodeIsCollapsed(flowyTreeNode)}
        <Icon data={faPlus} scale="0.51" />
      {:else}
        <Icon data={faCircle} scale="0.51" />
      {/if}
    </span>
    <span>&#x200b;</span>
    {#if isCurrentEntry}
      <EntryInput
        entryId={currEntryId}
        entryValue={tree.getEntryText(currEntryId)}
        entryHeadingSize={tree.getEntryHeadingSize(currEntryId)}
        {docCursorEntryId}
        {docCursorSelStart}
        {docCursorSelEnd}
        isEntryAbove={tree.hasEntryAbove(currEntryId)}
        isEntryBelow={tree.hasEntryBelow(currEntryId)}
        {handleSaveDocEntry}
        {handleSaveFullCursor}
        {handleGoUp}
        {handleGoDown}
        {handleCollapseEntry}
        {handleExpandEntry}
        {handleSplitEntry}
        {handleEntryBackspace}
        {handleIndent}
        {handleDedent}
        {handleMultilinePaste}
        {handleMoveCursorLeft}
        {handleMoveCursorRight}
        {handleSaveCursorPos}
        {handleSwapWithAboveEntry}
        {handleSwapWithBelowEntry}
        {handleCycleEntryHeadingSize}
        />
      {:else}
        <RenderedEntry
          entryId={currEntryId}
          entryText={tree.getEntryText(currEntryId)}
          entryHeadingSize={tree.getEntryHeadingSize(currEntryId)}
          {handleUpdateEntryLinks}
          />
      {/if}
  </div>
  {#if shouldShowDocNameAutocomplete}
    <div id="doc-name-autocomplete">
      {#each autoCompleteDocNames as docName}
        <div>{docName}</div>
      {/each}
    </div>
  {/if}
{/if}

{#if currNodeHasChildren && !isCollapsed}
  <ul class="tree-node-list">
    {#each childItemArray as child}
      <li>
        <Node
          {tree}
          flowyTreeNode={child.value}
          {docCursorEntryId}
          {docCursorSelStart}
          {docCursorSelEnd}
          {findRelevantDocNames}
          {handleSaveDocEntry}
          {handleSaveFullCursor}
          {handleGoUp}
          {handleGoDown}
          {handleCollapseEntry}
          {handleExpandEntry}
          {handleSplitEntry}
          {handleEntryBackspace}
          {handleIndent}
          {handleDedent}
          {handleMultilinePaste}
          {handleMoveCursorLeft}
          {handleMoveCursorRight}
          {handleSaveCursorPos}
          {handleUpdateEntryLinks}
          {handleSwapWithAboveEntry}
          {handleSwapWithBelowEntry}
          {handleCycleEntryHeadingSize}
          />
      </li>
    {/each}
  </ul>
{/if}
