<script>
  export let tree,
    flowyTreeNode,
    docTitle,
    docCursorEntryId,
    docCursorColId,
    docIsEditingName;
  export let handleSaveDocEntry,
    handleSaveFullCursor,
    handleGoUp,
    handleGoDown,
    handleEntryBackspace,
    handleSplitEntry,
    handleIndent,
    handleDedent;
  export let handleStartEditingDocName,
    handleCancelEditingDocName,
    handleSaveDocName,
    handleSaveCursorColId;
  import Node from "./Node.svelte";

  let docTitleText = docTitle;

  $: handleSaveName = () => handleSaveDocName(docTitleText);

  $: handleEditingCancel = () => {
    docTitleText = docTitle;
    handleCancelEditingDocName();
  };

  $: handleStartEditing = () => {
    docTitleText = docTitle;
    handleStartEditingDocName();
  };
</script>

<style>
  .doc-name-edit-action {
    cursor: pointer;
    text-decoration: underline;
  }
  .doc-name-edit-action:active {
    color: rgb(0, 80, 160);
  }

  #doc-name {
    margin: 0.2em 0;
  }

  #doc-name-display {
    font-size: 1.2em;
    font-weight: bold;
  }
  #doc-name-edit {
    margin-left: 1em;
    margin-top: 0.5em;
    display: inline-block;
    font-size: 0.75em;
    cursor: pointer;
  }
  #doc-name-edit:hover {
    text-decoration: underline;
  }

  #doc-name-input {
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
  {#if docIsEditingName}
    <div>
      <input
        type="text"
        id="doc-name-input"
        bind:value={docTitleText}
        placeholder="Document name" />
      <span class="doc-name-edit-action" on:click={handleSaveName}>save</span>
      <span class="doc-name-edit-action" on:click={handleEditingCancel}>
        cancel
      </span>
    </div>
  {:else}
    <div id="doc-name">
      <span id="doc-name-display">{docTitle}</span>
      <span id="doc-name-edit" on:click={handleStartEditing}>edit</span>
    </div>
  {/if}

  <Node
    {tree}
    {flowyTreeNode}
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
</div>
