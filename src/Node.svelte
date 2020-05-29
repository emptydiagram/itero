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

  import Icon from 'svelte-awesome';
  import { faCircle,faPlus } from '@fortawesome/free-solid-svg-icons';

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
    display: block;
    padding-left: 1.8em;
    list-style-type: none;
    border-left: 1px dotted #999;
    margin-left: 0.2em;
  }

  .tree-node-list li {
    display: flex;
    flex-direction: column;
  }

  .entry-display {
    display: flex;
    flex-direction: row;
  }

  .fa-icon {
    display: inline-block;
    width: 1em;
    height: 1em;
    margin-right: 0.5em;
  }
</style>

{#if currEntryId !== null}
  <div class="entry-display">
    <span class="fa-icon">
      {#if nodeIsCollapsed(flowyTreeNode)}
        <Icon data={faPlus} scale="0.6" />
      {:else}
        <Icon data={faCircle} scale="0.6" />
      {/if}
    </span>
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
  </div>
{/if}

{#if currNodeHasChildren && !isCollapsed}
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
