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

  $: childNodeArray = flowyTreeNode.getChildNodeArray();
</script>

<style>
  .tree-node-list {
    padding-left: 1.8em;
  }
</style>

{#if flowyTreeNode.getId() !== null}
  <EntryInput
    entryId={flowyTreeNode.getId()}
    entryValue={tree.getEntry(flowyTreeNode.getId())}
    {docCursorEntryId}
    {docCursorColId}
    isEntryAbove={tree.hasEntryAbove(flowyTreeNode.getId())}
    isEntryBelow={tree.hasEntryBelow(flowyTreeNode.getId())}
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

{#if childNodeArray.length > 0}
  <ul class="tree-node-list">
    {#each childNodeArray as child, i}
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
