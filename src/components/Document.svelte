<script>
  import BacklinksDisplay from "./BacklinksDisplay.svelte";
  import Header from './Header.svelte';
  import Node from "./Node.svelte";
  import { docsStore } from "./stores.js";

  import { afterUpdate } from 'svelte';
  import Icon from 'svelte-awesome';
  import { faEdit } from '@fortawesome/free-solid-svg-icons';

  let promise = Promise.resolve();  // Used to hold chain of typesetting calls

  function typeset(code) {
    promise = promise.then(() => {
      code();
      return MathJax.typesetPromise(); // eslint-disable-line no-undef
    }).catch((err) => console.log('Typeset failed: ' + err.message));
    return promise;
  }

  afterUpdate(() => {
    // (re)-render mathjax
    typeset(() => {
      MathJax.texReset(); // eslint-disable-line no-undef
      MathJax.typesetClear(); // eslint-disable-line no-undef
    })
  });


  $: docTitle = $docsStore.docName;

  let docTitleText = docTitle;

  $: handleSaveName = () => docsStore.saveEditingDocName(docTitleText);

  $: handleEditingCancel = () => {
    docTitleText = docTitle;
    docsStore.cancelEditingDocName();
  };

  $: handleStartEditing = () => {
    docTitleText = docTitle;
    docsStore.startEditingDocName();
  };

  $: docIsEditingName = $docsStore.docIsEditingName;

  $: currentTree =
    $docsStore.currentDocId !== null
      ? $docsStore.documents[$docsStore.currentDocId].tree
      : null;

  $: currentTreeRoot = (currentTree && currentTree.getRoot()) || null;

  // TODO: move into getBacklinks?
  $: backlinks = (function() {
    let backlinks = $docsStore.linkGraph.getBacklinks($docsStore.currentDocId);
    let backlinksObj = {};
    for (let [[docId, entryId], _] of backlinks.entries()) {
      if (!(docId in backlinksObj)) {
        backlinksObj[docId] = {
          id: docId,
          name: $docsStore.documents[docId].name,
          entries: {}
        };
      }
      backlinksObj[docId].entries[entryId] = {
        id: entryId,
        text: $docsStore.documents[docId].tree.getEntryText(entryId)
      };
    }
    return backlinksObj;
  })();

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
    margin: 0.2em 0 0 0;
  }

  #doc-name-display {
    font-size: 1.2em;
    font-weight: bold;
  }
  #doc-name-edit {
    margin-left: 1em;
    display: inline-block;
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
    background-color: #f0f0ea;
    width: calc(98% - 7em);
  }

  #document {
    font-family: Consolas, "Andale Mono WT", "Andale Mono", "Lucida Console",
      "Lucida Sans Typewriter", "DejaVu Sans Mono", "Bitstream Vera Sans Mono",
      "Liberation Mono", "Nimbus Mono L", Monaco, "Courier New", Courier,
      monospace;
    font-size: 1em;
  }
</style>

<Header isTop={false} />

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
      <span id="doc-name-edit" on:click={handleStartEditing}>
        <Icon data={faEdit} scale="0.91" />
      </span>
    </div>
  {/if}

  <Node
    tree={currentTree}
    flowyTreeNode={currentTreeRoot}
    docCursorEntryId={$docsStore.cursorEntryId}
    docCursorColId={$docsStore.cursorColId}

    handleCollapseEntry={docsStore.collapseEntry}
    handleDedent={docsStore.dedentEntry}
    handleEntryBackspace={docsStore.backspaceEntry}
    handleExpandEntry={docsStore.expandEntry}
    handleGoDown={docsStore.entryGoDown}
    handleGoUp={docsStore.entryGoUp}
    handleIndent={docsStore.indentEntry}
    handleMultilinePaste={docsStore.savePastedEntries}
    handleSaveCursorColId={docsStore.saveCursorColId}
    handleSaveDocEntry={docsStore.saveCurrentPageDocEntry}
    handleSaveFullCursor={docsStore.saveCursor}
    handleSplitEntry={docsStore.splitEntry}
    handleUpdateEntryLinks={docsStore.updateEntryLinks}
  />

  <BacklinksDisplay
    {backlinks}
  />
</div>
