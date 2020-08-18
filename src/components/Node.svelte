<script lang="ts">
  export let tree: FlowyTree,
    flowyTreeNode: FlowyTreeNode,
    docCursorEntryId: number | null,
    docCursorSelStart: number | null,
    docCursorSelEnd: number | null,
    docMouseoverEntryId: number | null,
    docOpenedMenuEntryId: number | null,
    findRelevantDocNames: (text: string) => string[],
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
    handleUpdateEntryLinks: (entryId: number, linkedPages: string[]) => void,
    handleCycleEntryHeadingSize: (entryId: number) => void,
    handleReplaceEntryTextAroundCursor: (newText: string) => void,
    handleSaveDocMouseoverEntryId: (entryId: number) => void,
    handleSaveDocOpenedMenuEntryId: (entryId: number) => void,
    handleChangeEntryType: (entryId: number, entryType: string) => void;


  import Icon from 'svelte-awesome';
  import { faCircle, faPlus, faEllipsisH } from '@fortawesome/free-solid-svg-icons';

  import type { FlowyTree } from '../FlowyTree';
  import type { FlowyTreeNode } from '../FlowyTree';
  import EntryInput from "./EntryInput.svelte";
  import EntryMenu from './EntryMenu.svelte';

  import RenderedEntry from "./RenderedEntry.svelte";
  import Node from "./Node.svelte";
  import { EntryDisplayState } from "../data";


  function nodeIsCollapsed(node: FlowyTreeNode): boolean {
    return node.hasChildren()
      && tree.getEntryDisplayState(node.getValue()) === EntryDisplayState.Collapsed;
  }

  function handleToggle(entryId: number, isCollapsed: boolean) {
    if (isCollapsed) {
      handleExpandEntry(entryId, true);
    } else {
      handleCollapseEntry(entryId, true);
    }
  }

  function handleDocNameAutocompleteClick(event: Event) {
    event.preventDefault();
    let el: HTMLElement = event.target as HTMLElement;
    handleReplaceEntryTextAroundCursor(el.textContent);
  }

  function handleMouseoverEntry() {
    if (currEntryId !== docMouseoverEntryId) {
      handleSaveDocMouseoverEntryId(currEntryId);
    }
  }

  function handleToggleEntryMenuOpen() {
    handleSaveDocOpenedMenuEntryId(currEntryId);
  }

  let currEntryId: number | null;
  $: currEntryId = flowyTreeNode.getValue();

  $: isRoot = currEntryId == null;

  let childNodeArray: Array<FlowyTreeNode>;
  $: childNodeArray = flowyTreeNode.getChildNodeArray();

  let currNodeHasChildren: boolean;
  $: currNodeHasChildren = childNodeArray.length > 0;

  let isCollapsed: boolean;
  $: isCollapsed = currNodeHasChildren
    && tree.getEntryDisplayState(currEntryId) == EntryDisplayState.Collapsed;

  let entryHeadingSize: number = 0;
  $: entryHeadingSize = (function() {
    if (currEntryId === 0 || currEntryId) {
      let newHeadingSize = tree.getEntryHeadingSize(currEntryId)
      return newHeadingSize;
    }
  })();

  let entryText: string = '';
  $: entryText = (function() {
    if (currEntryId == 0 || currEntryId) {
      let newText = tree.getEntryText(currEntryId);
      return newText;
    }
  })();


  let isCurrentEntry: boolean;
  $: isCurrentEntry = (currEntryId != null) && currEntryId === docCursorEntryId;


  let isDisplayingMenu: boolean;
  $: isDisplayingMenu = isCurrentEntry || currEntryId === docMouseoverEntryId;


  // TODO: move to a derived store?
  let autoCompleteDocNames: string[];
  $: autoCompleteDocNames = (function() {
    if (isCurrentEntry && docCursorSelStart === docCursorSelEnd) {
      let entryValue = tree.getEntryText(currEntryId);
      let [entryBefore, entryAfter] = [entryValue.substring(0, docCursorSelStart), entryValue.substring(docCursorSelStart)];
      let entryBeforeRev = [...entryBefore].reverse().join("");
      let prevOpeningRev = /^([^\[\]]*)\[\[(?!\\)/g;
      let prevOpeningRevResult = entryBeforeRev.match(prevOpeningRev);
      let nextClosing = /^(.{0}|([^\[\]]*[^\]\\]))]]/g;
      let nextClosingResult = entryAfter.match(nextClosing);

      if (prevOpeningRevResult != null && nextClosingResult != null) {
        let prevLinkRev = prevOpeningRevResult[0];
        let prevPageRev = prevLinkRev.substring(0, prevLinkRev.length - 2);
        let prevPage = [...prevPageRev].reverse().join("");
        let pageTitleText = prevPage  + nextClosingResult[0].substring(0, nextClosingResult[0].length - 2);
        let relevantDocNames: string[] = pageTitleText.length > 0
          ? findRelevantDocNames(pageTitleText) : [];
        return relevantDocNames;
      }
    }
    return null;
  })()

  let shouldShowDocNameAutocomplete: boolean;
  $: shouldShowDocNameAutocomplete = autoCompleteDocNames !== null;

  let shouldShowMenu: boolean;
  $: shouldShowMenu = docOpenedMenuEntryId === currEntryId;
</script>

<style>
  .tree-node-list {
    display: block;
    padding-left: 1.8em;
    list-style-type: none;
    border-left: 1px dotted #999;
    margin-left: 0.2em;
  }

  .tree-node-list.root-list {
    border-left: 0;
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

  .menu-container {
    margin-left: -1.6em;
    margin-right: 1em;
    visibility: hidden;
  }

  .menu-container.display-menu {
    visibility: visible;
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

  .doc-name-autocomplete-option {
    cursor: pointer;
  }

  #doc-name-autocomplete-default {
    color: #7f7f7f;
  }

</style>

{#if currEntryId !== null}
  <div class="entry-display" data-entry-id={currEntryId} on:mouseover={handleMouseoverEntry}>
    <div
      class={`menu-container ${isDisplayingMenu ? 'display-menu' : ''}`}
      on:click={handleToggleEntryMenuOpen}>
      <Icon data={faEllipsisH} scale="0.81" />
    </div>
    <div class="icon-container" on:click={() => handleToggle(currEntryId, nodeIsCollapsed(flowyTreeNode))}>
      {#if nodeIsCollapsed(flowyTreeNode)}
        <Icon data={faPlus} scale="0.51" />
      {:else}
        <Icon data={faCircle} scale="0.51" />
      {/if}
    </div>
    <span>&#x200b;</span>
    {#if isCurrentEntry}
      <EntryInput
        entryId={currEntryId}
        entryValue={tree.getEntryText(currEntryId)}
        entryHeadingSize={entryHeadingSize}
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
          entryText={entryText}
          entryHeadingSize={entryHeadingSize}
          {handleUpdateEntryLinks}
          />
      {/if}
  </div>
  {#if shouldShowDocNameAutocomplete}
    <div id="doc-name-autocomplete">
      {#if autoCompleteDocNames.length > 0}
        {#each autoCompleteDocNames as docName}
          <div class="doc-name-autocomplete-option" on:click={handleDocNameAutocompleteClick}>{docName}</div>
        {/each}
      {:else}
        <div id="doc-name-autocomplete-default"><em>Search page titles</em></div>
      {/if}
    </div>
  {/if}
  {#if shouldShowMenu}
    <EntryMenu
      currEntryType={tree.getEntryType(currEntryId)}
      entryId={currEntryId}
      {handleChangeEntryType}
    />
  {/if}
{/if}

{#if currNodeHasChildren && !isCollapsed}
  <ul class={`tree-node-list ${isRoot ? 'root-list' : ''}`}>
    {#each childNodeArray as child}
      <li>
        <Node
          {tree}
          flowyTreeNode={child}
          {docCursorEntryId}
          {docCursorSelStart}
          {docCursorSelEnd}
          {docMouseoverEntryId}
          {docOpenedMenuEntryId}
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
          {handleReplaceEntryTextAroundCursor}
          {handleSaveDocMouseoverEntryId}
          {handleSaveDocOpenedMenuEntryId}
          {handleChangeEntryType}
          />
      </li>
    {/each}
  </ul>
{/if}
