<script>
  export let tree, flowyTreeNode, docCursorEntryId, docCursorColId;
  export let handleSaveDocEntry,
    handleSaveFullCursor,
    handleGoUp,
    handleGoDown,
    handleCollapseEntry,
    handleExpandEntry,
    handleSplitEntry,
    handleEntryBackspace,
    handleIndent,
    handleDedent,
    handleSaveCursorColId;

  import EntryInput from "./EntryInput.svelte";
  import Node from "./Node.svelte";
  import { EntryDisplayState } from "./data.js";

  function nodeIsCollapsed(node) {
    return node.hasChildren()
      && tree.getEntryDisplayState(node.getId()) === EntryDisplayState.COLLAPSED;
  }

  $: currEntryId = flowyTreeNode.getId();

  $: childItemArray = flowyTreeNode.getChildNodeArray();
  $: currNodeHasChildren = childItemArray.length > 0;

  $: isCollapsed = currNodeHasChildren
    && tree.getEntryDisplayState(currEntryId) == EntryDisplayState.COLLAPSED;

</script>

<style>
  .tree-node-list {
    padding-left: 1.8em;
  }

  .tree-node-list li {
    list-style-type: disc;
  }

  .tree-node-list li.collapsed {
    color: deepskyblue;
  }

</style>

{#if currEntryId !== null}
  <EntryInput
    entryId={currEntryId}
    entryValue={tree.getEntryText(currEntryId)}
    {docCursorEntryId}
    {docCursorColId}
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
    {handleSaveCursorColId} />
{/if}

{#if currNodeHasChildren && !isCollapsed}
  <ul class="tree-node-list">
    {#each childItemArray as child, i}
      <li class={nodeIsCollapsed(child.value) ? 'collapsed' : ''}>
        <Node
          {tree}
          flowyTreeNode={child.value}
          {docCursorEntryId}
          {docCursorColId}
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
          {handleSaveCursorColId} />
      </li>
    {/each}
  </ul>
{/if}
