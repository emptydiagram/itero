<script>
  import { createHashHistory } from "history";
  import { onMount } from "svelte";
  import { assign } from "xstate";
  import Icon from 'svelte-awesome';
  import { faHammer } from '@fortawesome/free-solid-svg-icons';

  import { docsStore } from "./stores.js";
  import Document from "./Document.svelte";
  import Top from "./Top.svelte";
  import FlowyTree from "../FlowyTree.js";
  import DataStore from "../DataStore.js";
  import createMachine from "../machine.js";
  import { useMachine } from "./useMachine.js";
  import { DataManager, makeInitContextFromDocuments, makeDoc, EntryDisplayState, createNewDocument } from "../data.js";
  import { findChildNodeSerializedCursorPosFromSelection } from "../markup/util.js";

  function findRenderedEntryParent(initNode) {
    let currNode = initNode;
    while (currNode != null
        && !(currNode.className != null && currNode.className.includes("rendered-entry"))) {
      currNode = currNode.parentNode;
    }
    return currNode;
  }

  onMount(() => {
    // Listen for changes to the current location.
    const _unlisten = history.listen((location, action) => {
      // location is an object like window.location
      // if it's a REPLACE, don't trigger a navigation event
      if (action !== 'REPLACE' && location.pathname.startsWith("/")) {
        route(location.pathname);
      }
    });

    document.addEventListener('selectionchange', () => {
      let sel = document.getSelection();
      const renderedEntryNode = findRenderedEntryParent(sel.anchorNode);
      if (renderedEntryNode == null) {
        return;
      }

      let colResult = findChildNodeSerializedCursorPosFromSelection(renderedEntryNode, sel, 0);
      let newColId = colResult.pos;

      let newEntryId = parseInt(renderedEntryNode.dataset.entryId);
      docsStore.saveCursor(newEntryId, newColId);
    });

    // handle initial navigation to a page
    if (location.hash.startsWith("#/")) {
      route(location.hash.substring(1));
    }

  });

  const history = createHashHistory();


  function isObject(obj) {
    return obj === Object(obj);
  }

  function initDocStoreFromInitContext(initContext) {
    docsStore.init(initContext.documents, initContext.docIdLookupByDocName, initContext.linkGraph);
  }



  /*** service and state ***/

  let dataMgr = new DataManager(new DataStore);
  let initContext = makeInitContextFromDocuments(dataMgr.getDocuments());
  initDocStoreFromInitContext(initContext);

  let machine = createMachine();
  const { state: machineState, send: machineSend } = useMachine(machine);

  /*** history ***/

  function route(pathname) {
    if (pathname === "/") {
      machineSend("GO_HOME");
      return;
    }
    if (pathname === "/create") {
      docsStore.createNewDocument();
      machineSend("CREATE_DOC");
      return;
    }
    if (pathname.startsWith("/page/")) {
      let pageName = pathname.substring(6);
      if (pageName in $docsStore.docIdLookupByDocName) {
        let docId = $docsStore.docIdLookupByDocName[pageName];
        docsStore.navigateToDoc(docId);
        machineSend("NAVIGATE");
        history.replace(`/${docId}`);
        return;
      }
      history.go(-1);
      return;
    }

    let newId = pathname.substring(1);
    let parseResult = parseInt(newId);
    if (!isNaN(parseResult)) {
      let docId = parseResult;
      docsStore.navigateToDoc(docId);
      machineSend("NAVIGATE");
    } else {
      machineSend("GO_HOME");
    }
  }

  /*** event handlers & some reactive variables ***/

  function createDoc() {
    // navigate to #/create
    history.push("/create");
  }

  // from https://wiki.developer.mozilla.org/en-US/docs/Glossary/Base64$revision/1597964#The_Unicode_Problem
  function b64EncodeUnicode(str) {
      // first we use encodeURIComponent to get percent-encoded UTF-8,
      // then we convert the percent encodings into raw bytes which
      // can be fed into btoa.
      return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
          function toSolidBytes(match, p1) {
              return String.fromCharCode('0x' + p1);
      }));
  }

  function downloadData() {
    let s = dataMgr.getDocumentsString();
    location.assign("data:application/octet-stream;base64," + b64EncodeUnicode(s));
  }

  function uploadData() {
    let el = document.getElementById('import-docs');
    el.click();
  }

  function handleDocsImport(ev) {
    console.log(" ## handleDocsImport, ev = ", ev);
    console.log(" ## handleDocsImport, this.files = ", this, this.files);
    const filesList = this.files;
    if (filesList.length > 1) {
        // TODO: show error to UI?
      console.log("TODO: multiple files uploaded. show an error message of some kind? is this even possible?");
      return;
    }

    const file = filesList[0];
    file.arrayBuffer().then(buffer => {
      console.log(" ## handleDocsImport, the array buffer = ", buffer);
      // TODO: detect the encoding and use Uint8Array / Uint16Array as appropriate
      let docsStr = String.fromCharCode.apply(null, new Uint8Array(buffer));
      console.log(" ## handleFIleUpload, docsStr = ", docsStr);
      try {
        let newFileUploadObj = JSON.parse(docsStr);

        Object.entries(newFileUploadObj).forEach(([id, doc]) => {
          newFileUploadObj[id] = makeDoc(doc.id, doc.name, doc.tree.entries, doc.tree.node);
        })

        // TODO: verify that it has the required fields in the object
        let initContext = makeInitContextFromDocuments(newFileUploadObj);
        initDocStoreFromInitContext(initContext);
        machineSend("IMPORT_DOCS");
      } catch (err) {
        // TODO: show error to UI
        console.log("TODO: file is not a valid JSON object, err = ", err);
      }
    });
  }


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

  // save the latest document
  $: dataMgr.saveDocuments($docsStore.documents);

  $: isAtTop = $machineState.matches("flowiki.top");

  $: displayDocs = $docsStore.docsDisplayList.map(id => {
    return $docsStore.documents[id];
  });

  $: currentTree =
    $docsStore.currentDocId !== null
      ? $docsStore.documents[$docsStore.currentDocId].tree
      : null;

  $: currentTreeRoot = (currentTree && currentTree.getRoot()) || null;

  $: if (history.location.pathname === "/create" && typeof $docsStore.currentDocId === "number") {
    history.replace(`/${$docsStore.currentDocId}`);
  }
</script>

<style>
  #import-docs {
    display: none;
  }

  #actions-bar {
    margin-top: 2em;
  }

  #actions-bar > button {
    font-size: 0.9em;
  }
</style>

{#if isAtTop}
  <Top {displayDocs} {createDoc} />
{:else}
  <Document
    tree={currentTree}
    flowyTreeNode={currentTreeRoot}
    docCursorEntryId={$docsStore.cursorEntryId}
    docCursorColId={$docsStore.cursorColId}
    docTitle={$docsStore.docName}
    backlinks={backlinks}
    docIsEditingName={$docsStore.docIsEditingName}
    handleGoUp={docsStore.entryGoUp}
    handleGoDown={docsStore.entryGoDown}
    handleSaveFullCursor={docsStore.saveCursor}
    handleSaveCursorColId={docsStore.saveCursorColId}
    handleIndent={docsStore.indentEntry}
    handleDedent={docsStore.dedentEntry}
    handleSplitEntry={docsStore.splitEntry}
    handleEntryBackspace={docsStore.backspaceEntry}
    handleMultilinePaste={docsStore.savePastedEntries}
    handleUpdateEntryLinks={docsStore.updateEntryLinks}
    handleCollapseEntry={docsStore.collapseEntry}
    handleExpandEntry={docsStore.expandEntry}
    handleSaveDocEntry={docsStore.saveCurrentPageDocEntry}
    handleStartEditingDocName={docsStore.startEditingDocName}
    handleCancelEditingDocName={docsStore.cancelEditingDocName}
    handleSaveDocName={docsStore.saveEditingDocName}
    />
{/if}

<div id="actions-bar">
  <Icon data={faHammer} scale="1" />
  <button on:click={downloadData}>export</button>

  <button on:click={uploadData}>import</button>
</div>
<input id="import-docs" type="file" on:change={handleDocsImport} />
