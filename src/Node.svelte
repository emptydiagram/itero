<script>
  export let tree, flowyTreeNode, nodeCursorEntryId, nodeCursorColId;
  export let handleSaveNodeEntry,
    handleSaveFullCursor,
    handleGoUp,
    handleGoDown,
    handleSplitEntry,
    handleEntryBackspace,
    handleIndent,
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
    {nodeCursorEntryId}
    {nodeCursorColId}
    isEntryAbove={tree.hasEntryAbove(flowyTreeNode.getId())}
    isEntryBelow={tree.hasEntryBelow(flowyTreeNode.getId())}
    {handleSaveNodeEntry}
    {handleSaveFullCursor}
    {handleGoUp}
    {handleGoDown}
    {handleSplitEntry}
    {handleEntryBackspace}
    {handleIndent}
    {handleSaveCursorColId} />
{/if}

{#if childNodeArray.length > 0}
  <ul class="tree-node-list">
    {#each childNodeArray as child, i}
      <li>
        <Node
          {tree}
          flowyTreeNode={child.value}
          {nodeCursorEntryId}
          {nodeCursorColId}
          {handleSaveNodeEntry}
          {handleSaveFullCursor}
          {handleGoUp}
          {handleGoDown}
          {handleSplitEntry}
          {handleEntryBackspace}
          {handleIndent}
          {handleSaveCursorColId} />
      </li>
    {/each}
  </ul>
{/if}
