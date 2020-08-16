<script lang="ts">
  export let params: any = {};

  import BacklinksDisplay from "./BacklinksDisplay.svelte";
  import Header from './Header.svelte';
  import Node from "./Node.svelte";
  import { docsStore } from "../stores";
  import type { BacklinksInfo } from "../backlinks";
  import type { Document } from "../data";

  import { afterUpdate } from 'svelte';
  import Icon from 'svelte-awesome';
  import { faEdit } from '@fortawesome/free-solid-svg-icons';

  let promise = Promise.resolve();  // Used to hold chain of typesetting calls
  let MathJax: any;

  function typeset(code: () => void) {
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

  $: {
    let parseResult = parseInt(params.id);
    if (!isNaN(parseResult)) {
      let docId = parseResult;
      docsStore.navigateToDoc(docId.toString());
    } else {
      // TODO: do something?
    }
  }

  $: currentTree = (function() {
    return $docsStore.currentDocId !== null
      ? $docsStore.documents[$docsStore.currentDocId].tree
      : null;
  })();

  $: currentTreeRoot = (currentTree && currentTree.getRoot()) || null;


  let docTitleText = $docsStore.docName;

  $: docTitle = $docsStore.docName;


  function handleSaveName() {
    docsStore.saveEditingDocName(docTitleText);
  }

  function handleEditingCancel() {
    docTitleText = docTitle;
    docsStore.cancelEditingDocName();
  }

  function handleStartEditing() {
    docTitleText = docTitle;
    docsStore.startEditingDocName();
  }

  function findRelevantDocNames(text: string) {
    let docNames = [];

    text.split(/\s+/).forEach((word: string) => {
      Object.keys($docsStore.docNameInvIndex).forEach((word2: string) => {
        if (word2.includes(word)) {
          $docsStore.docNameInvIndex[word2].forEach((docId: string) => {
            if (!docNames.includes($docsStore.documents[docId].name)) {
              docNames.push($docsStore.documents[docId].name);
            }
          });
        }
      })
    });

    return docNames;
  }

  $: docIsEditingName = $docsStore.docIsEditingName;


  // TODO: move into getBacklinks?
  let backlinks: BacklinksInfo;
  $: backlinks = (function() {
    let backlinks = $docsStore.linkGraph.getBacklinks($docsStore.currentDocId);
    let backlinksObj = {};
    for (let [[docId, entryId], _] of backlinks.entries()) {
      let currDoc: Document = $docsStore.documents[docId];
      if (!(docId in backlinksObj)) {
        backlinksObj[docId] = {
          id: docId,
          name: $docsStore.documents[docId].name,
          entries: {}
        };
      }
      backlinksObj[docId].entries[entryId] = {
        id: entryId,
        text: currDoc.tree.getEntryText(entryId),
        headingSize: currDoc.tree.getEntryHeadingSize(entryId),
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
    font-size: 1.4em;
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
    font-size: 1.4em;
    font-weight: bold;
    background-color: #f0f0ea;
    width: calc(98% - 7em);
  }

  #document {
    font-family: "Iowan Old Style", "Apple Garamond", Baskerville, "Times New Roman", "Droid Serif", Times, "Source Serif Pro",
      serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
  }
</style>

<Header />

<div id="document">
  <div id="doc-name-container">
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
  </div>

  <div id="doc-content">
    <Node
      tree={currentTree}
      flowyTreeNode={currentTreeRoot}
      docCursorEntryId={$docsStore.cursorEntryId}
      docCursorSelStart={$docsStore.cursorSelectionStart}
      docCursorSelEnd={$docsStore.cursorSelectionEnd}

      {findRelevantDocNames}
      handleCollapseEntry={docsStore.collapseEntry}
      handleDedent={docsStore.dedentEntry}
      handleEntryBackspace={docsStore.backspaceEntry}
      handleExpandEntry={docsStore.expandEntry}
      handleGoDown={docsStore.entryGoDown}
      handleGoUp={docsStore.entryGoUp}
      handleIndent={docsStore.indentEntry}
      handleMultilinePaste={docsStore.savePastedEntries}

      handleMoveCursorLeft={docsStore.moveCursorLeft}
      handleMoveCursorRight={docsStore.moveCursorRight}
      handleSaveCursorPos={docsStore.saveCursorPosition}
      handleSaveDocEntry={docsStore.saveCurrentPageDocEntry}
      handleSaveFullCursor={docsStore.saveCursor}
      handleSplitEntry={docsStore.splitEntry}
      handleUpdateEntryLinks={docsStore.updateEntryLinks}
      handleSwapWithAboveEntry={docsStore.swapWithAboveEntry}
      handleSwapWithBelowEntry={docsStore.swapWithBelowEntry}
      handleCycleEntryHeadingSize={docsStore.cycleEntryHeadingSize}
      handleReplaceEntryTextAroundCursor={docsStore.replaceEntryTextAroundCursor}
    />
  </div>

  <BacklinksDisplay
    {backlinks}
  />
</div>
