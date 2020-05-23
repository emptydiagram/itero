<script>
  export let entries, flowyTreeNode, nodeCursorRowId, nodeCursorColId;
  export let handleSaveNodeEntry,
    handleSaveFullCursor,
    handleGoUp,
    handleGoDown,
    handleSplitEntry,
    handleEntryBackspace,
    handleSaveCursorColId;

  import EntryInput from "./EntryInput.svelte";
  import Node from "./Node.svelte";

  $: console.log("%$#@ in NODE, entries = ", entries);
  $: console.log("%$#@ in NODE, flowyTreeNode = ", flowyTreeNode);

  $: atFirstRow = nodeCursorRowId === 0;
  $: atLastRow = nodeCursorRowId === Object.keys(entries).length - 1;
  $: childNodeArray = flowyTreeNode.getChildNodeArray();
</script>

<style>
  .tree-node-list {
    padding-left: 2em;
  }
</style>

{#if flowyTreeNode.getId() !== null}
  <EntryInput
    entryId={flowyTreeNode.getId()}
    entryValue={entries[flowyTreeNode.getId()]}
    {nodeCursorRowId}
    {nodeCursorColId}
    {atFirstRow}
    {atLastRow}
    {handleSaveNodeEntry}
    {handleSaveFullCursor}
    {handleGoUp}
    {handleGoDown}
    {handleSplitEntry}
    {handleEntryBackspace}
    {handleSaveCursorColId} />
{/if}

{#if childNodeArray.length > 0}
  <ul class="tree-node-list">
    {#each childNodeArray as child, i}
      <li>
        <Node
          {entries}
          flowyTreeNode={child.value}
          {nodeCursorRowId}
          {nodeCursorColId}
          {handleSaveNodeEntry}
          {handleSaveFullCursor}
          {handleGoUp}
          {handleGoDown}
          {handleSplitEntry}
          {handleEntryBackspace}
          {handleSaveCursorColId} />
      </li>
    {/each}
  </ul>
{/if}
