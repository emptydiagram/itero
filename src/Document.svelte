<script>
  export let tree,
    flowyTreeNode,
    nodeTitle,
    nodeCursorEntryId,
    nodeCursorColId,
    nodeIsEditingName;
  export let handleSaveNodeEntry,
    handleSaveFullCursor,
    handleGoUp,
    handleGoDown,
    handleEntryBackspace,
    handleSplitEntry,
    handleIndent,
    handleDedent;
  export let handleStartEditingNodeName,
    handleCancelEditingNodeName,
    handleSaveNodeName,
    handleSaveCursorColId;
  import Node from "./Node.svelte";

  let nodeTitleText = nodeTitle;

  $: handleSaveName = () => handleSaveNodeName(nodeTitleText);

  $: handleEditingCancel = () => {
    nodeTitleText = nodeTitle;
    handleCancelEditingNodeName();
  };

  $: handleStartEditing = () => {
    nodeTitleText = nodeTitle;
    handleStartEditingNodeName();
  };
</script>

<style>
  .node-name-edit-action {
    cursor: pointer;
    text-decoration: underline;
  }
  .node-name-edit-action:active {
    color: rgb(0, 80, 160);
  }

  #node-name {
    margin: 0.2em 0;
  }

  #node-name-display {
    font-size: 1.2em;
    font-weight: bold;
  }
  #node-name-edit {
    margin-left: 1em;
    margin-top: 0.5em;
    display: inline-block;
    font-size: 0.75em;
    cursor: pointer;
  }
  #node-name-edit:hover {
    text-decoration: underline;
  }

  #node-name-input {
    margin: 0;
    padding: 0.2em 0;
    border: 0;
    font-size: 1.2em;
    font-weight: bold;
    background-color: #f7f7f2;
  }

  #document {
    font-family: Consolas, "Andale Mono WT", "Andale Mono", "Lucida Console",
      "Lucida Sans Typewriter", "DejaVu Sans Mono", "Bitstream Vera Sans Mono",
      "Liberation Mono", "Nimbus Mono L", Monaco, "Courier New", Courier,
      monospace;
    font-size: 1em;
  }
</style>

<div id="document">
  {#if nodeIsEditingName}
    <div>
      <input
        type="text"
        id="node-name-input"
        bind:value={nodeTitleText}
        placeholder="Document name" />
      <span class="node-name-edit-action" on:click={handleSaveName}>save</span>
      <span class="node-name-edit-action" on:click={handleEditingCancel}>
        cancel
      </span>
    </div>
  {:else}
    <div id="node-name">
      <span id="node-name-display">{nodeTitle}</span>
      <span id="node-name-edit" on:click={handleStartEditing}>edit</span>
    </div>
  {/if}

  <Node
    {tree}
    {flowyTreeNode}
    {nodeCursorEntryId}
    {nodeCursorColId}
    {handleSaveNodeEntry}
    {handleSaveFullCursor}
    {handleGoUp}
    {handleGoDown}
    {handleSplitEntry}
    {handleEntryBackspace}
    {handleIndent}
    {handleDedent}
    {handleSaveCursorColId} />
</div>
