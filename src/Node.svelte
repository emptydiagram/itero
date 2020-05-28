<script>
  export let tree, flowyTreeNode, docCursorEntryId, docCursorColId;
  export let handleSaveDocEntry,
    handleSaveFullCursor,
    handleGoUp,
    handleGoDown,
    handleSplitEntry,
    handleEntryBackspace,
    handleIndent,
    handleDedent,
    handleSaveCursorColId;

  import EntryInput from "./EntryInput.svelte";
  import Node from "./Node.svelte";

  $: currEntryId = flowyTreeNode.getId();

  $: childItemArray = flowyTreeNode.getChildNodeArray();
  $: currNodeHasChildren = childItemArray.length > 0;

</script>

<style>
  .tree-node-list {
    padding-left: 1.8em;
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
    {handleSplitEntry}
    {handleEntryBackspace}
    {handleIndent}
    {handleDedent}
    {handleSaveCursorColId} />
{/if}

{#if currNodeHasChildren }
  <ul class="tree-node-list">
    {#each childItemArray as child, i}
      <li>
        <Node
          {tree}
          flowyTreeNode={child.value}
          {docCursorEntryId}
          {docCursorColId}
          {handleSaveDocEntry}
          {handleSaveFullCursor}
          {handleGoUp}
          {handleGoDown}
          {handleSplitEntry}
          {handleEntryBackspace}
          {handleIndent}
          {handleDedent}
          {handleSaveCursorColId} />
      </li>
    {/each}
  </ul>
{/if}
