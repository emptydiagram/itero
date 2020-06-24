<script>
  import { createHashHistory } from "history";
  import { onMount } from "svelte";
  import { assign } from "xstate";
  import Icon from 'svelte-awesome';
  import { faHammer } from '@fortawesome/free-solid-svg-icons';

  import { nextDocCursorEntryId, nextDocCursorColId, nextDocName, nextDocEntryText,
           collapseExpandEntryId, updateLinksEntryId, updateLinksPageNames } from "./stores.js";
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
      handleSaveFullCursor(newEntryId, newColId);
    });

    // handle initial navigation to a page
    if (location.hash.startsWith("#/")) {
      route(location.hash.substring(1));
    }

  });

  let currentHashId;
  let fileUploadObj;

  const history = createHashHistory();


  function isObject(obj) {
    return obj === Object(obj);
  }

  let navigateToDocAction = assign(ctxt => {
    let docId = currentHashId;
    let doc = ctxt.documents[docId];
    let initEntryId = doc.tree.getTopEntryId();
    return {
      currentDocId: docId,
      docCursorEntryId: initEntryId,
      docTitle: doc.name
    };
  });

  let importDocsAction = assign(_ctxt => {
    return makeInitContextFromDocuments(fileUploadObj);
  });

  let saveDocNameAction = assign(ctxt => {
    let copyDocs = { ...ctxt.documents };

    let i = ctxt.currentDocId;
    copyDocs[i] = { ...ctxt.documents[i] };
    copyDocs[i].name = $nextDocName;

    let oldDocName = ctxt.docIdLookupByDocName;
    let newLookup = { ...ctxt.docIdLookupByDocName };
    delete newLookup[oldDocName];
    newLookup[$nextDocName] = ctxt.currentDocId;

    return {
      documents: copyDocs,
      docTitle: $nextDocName,
      docIdLookupByDocName: newLookup,
    };
  });

  let saveDocEntryAction = assign(ctxt => {
    let copyDocs = { ...ctxt.documents };
    let i = ctxt.currentDocId;
    let j = ctxt.docCursorEntryId;
    copyDocs[i] = { ...ctxt.documents[i] };
    let newTree = new FlowyTree(
      copyDocs[i].tree.getEntries(),
      copyDocs[i].tree.getRoot()
    );
    copyDocs[i].tree = newTree;
    newTree.setEntryText(j, $nextDocEntryText);
    return {
      documents: copyDocs,
      docCursorColId: $nextDocCursorColId
    };
  });

  // the action of SAVE_FULL_CURSOR
  let saveFullCursorAction = assign(_ctxt => {
    return {
      docCursorEntryId: $nextDocCursorEntryId,
      docCursorColId: $nextDocCursorColId
    };
  });

  let saveCursorColIdAction = assign(_ctxt => {
    return {
      docCursorColId: $nextDocCursorColId
    };
  });

  let backspaceAction = assign(ctxt => {
    let copyDocs = { ...ctxt.documents };
    let currentDoc = copyDocs[ctxt.currentDocId];
    currentDoc.tree = new FlowyTree(
      currentDoc.tree.getEntries(),
      currentDoc.tree.getRoot()
    );
    let colId = ctxt.docCursorColId;

    if (colId > 0) {
      let currEntryText = currentDoc.tree.getEntryText(ctxt.docCursorEntryId);
      let currTextLength = currEntryText.length;
      // colId might be larger than the text length, so handle it
      let actualColId = Math.min(colId, currTextLength);
      let newEntry =
        currEntryText.substring(0, actualColId - 1) + currEntryText.substring(actualColId);
      currentDoc.tree.setEntryText(ctxt.docCursorEntryId, newEntry);

      nextDocCursorColId.set(actualColId - 1);
      return {
        docCursorColId: actualColId - 1,
        documents: copyDocs
      };
    }

    // col is zero, so we merge adjacent entries
    let currTree = ctxt.documents[ctxt.currentDocId].tree;
    let entryId = ctxt.docCursorEntryId;

    // cases where backspacing @ col 0 is a no-op
    //  - if curr entry has no entry above (no parent, no previous sibling)
    //  - if current has children + previous sibling, and previous sibling has children
    //  - if current has children + no previous sibling
    if (currTree.hasEntryAbove(entryId)) {

      let currItem = currTree.getEntryItem(entryId);
      let prevItem = currItem.prev;
      if (currItem.value.hasChildren() && (prevItem == null || prevItem.value.hasChildren())) {
        return {};
      }


      let newDocs;
      newDocs = { ...ctxt.documents };
      let docId = ctxt.currentDocId;
      let currDoc = newDocs[docId];


      currentDoc.tree = new FlowyTree(
        currDoc.tree.getEntries(),
        currDoc.tree.getRoot()
      );

      let currEntryText = currDoc.tree.getEntryText(entryId);

      let newEntryId, newColId;
      if (!currItem.value.hasChildren()) {
        // if current has no children, we delete current and append current's text
        // to previous entry.
        let prevEntryId = currTree.getEntryIdAboveWithCollapse(entryId);
        let prevRowOrigEntryText = currDoc.tree.getEntryText(prevEntryId);
        currDoc.tree.setEntryText(
          prevEntryId,
          prevRowOrigEntryText + currEntryText
        );
        currDoc.tree.removeEntry(entryId);
        newEntryId = prevEntryId;
        newColId = prevRowOrigEntryText.length;

      } else {
        // otherwise, current has children, and so if we had (prevItem == null || prevItem.value.hasChildren()), then
        // we would have aborted the backspace.
        // thus we must either have (prevItem exists && has no children)
        // so: delete previous, prepend its text to current element
        let prevEntryId = currTree.getEntryIdAbove(entryId);
        let prevRowOrigEntryText = currDoc.tree.getEntryText(prevEntryId);

        currDoc.tree.setEntryText(
          entryId,
          prevRowOrigEntryText + currEntryText
        );
        currDoc.tree.removeEntry(prevEntryId);
        newEntryId = entryId;
        newColId = prevRowOrigEntryText.length;
      }


      // NOTE: we *set* currentCursorColId here.
      nextDocCursorColId.set(newColId);
      return {
        docCursorEntryId: newEntryId,
        docCursorColId: newColId,
        documents: newDocs
      };
    }
  });


  let collapseEntryAction = assign(ctxt => {
    // check if display state is collapsed, and, if so, expand
    let docId = ctxt.currentDocId;
    let entryId = $collapseExpandEntryId;

    let newDocs = { ...ctxt.documents };
    let currDoc = newDocs[docId];
    let currTree = currDoc.tree;
    let currHasChildren = currTree.getEntryItem(entryId).value.hasChildren();

    if (currHasChildren && currTree.getEntryDisplayState(entryId) === EntryDisplayState.EXPANDED) {
      let newTree = new FlowyTree(currTree.getEntries(), currTree.getRoot());
      currDoc.tree = newTree;
      newTree.setEntryDisplayState(entryId, EntryDisplayState.COLLAPSED)

      return {
        documents: newDocs,
      };
    }

    return {};
  });

  let expandEntryAction = assign(ctxt => {
    // check if display state is collapsed, and, if so, expand
    let docId = ctxt.currentDocId;
    let entryId = $collapseExpandEntryId;

    let newDocs = { ...ctxt.documents };
    let currDoc = newDocs[docId];
    let currTree = currDoc.tree;
    let currHasChildren = currTree.getEntryItem(entryId).value.hasChildren();

    if (currHasChildren && currTree.getEntryDisplayState(entryId) === EntryDisplayState.COLLAPSED) {
      let newTree = new FlowyTree(currTree.getEntries(), currTree.getRoot());
      currDoc.tree = newTree;
      newTree.setEntryDisplayState(entryId, EntryDisplayState.EXPANDED)

      return {
        documents: newDocs,
      };
    }

    return {};
  });

  let savePastedEntriesAction = assign(ctxt => {
    console.log(" saved pasted entries act");
    let copyDocs = { ...ctxt.documents };
    let i = ctxt.currentDocId;
    let entryId = ctxt.docCursorEntryId;
    console.log(" SPEA, (doc id, entry id) = ", i, entryId);
    let parentId = copyDocs[i].tree.getParentId(entryId);
    console.log(" SPEA, (doc id, entry id, parent id) = ", i, entryId, parentId);
    copyDocs[i] = { ...ctxt.documents[i] };
    let newTree = new FlowyTree(
      copyDocs[i].tree.getEntries(),
      copyDocs[i].tree.getRoot()
    );
    copyDocs[i].tree = newTree;
    let currEntryId = entryId;
    $nextDocEntryText.split('\n').forEach(line => {
      console.log("inserting below ", currEntryId, " line = ", line);
      currEntryId = newTree.insertEntryBelow(currEntryId, parentId, line);
    });
    return {
      documents: copyDocs,
    };
  });

  // compute the diff between the current set of links and the new set
  //  - NOTE: we start with the new set of linked *page names*, so we need to look up doc ids
  //     - whenever we find a page name with no doc id, need to automatically create
  // for each removed and added link in the entry, update the link graph
  // return { updated LinkGraph, updated documents object }
  let updateEntryLinksAction = assign(ctxt => {
    let copyDocs = { ...ctxt.documents };
    let newDisplayDocs = [...ctxt.displayDocs];
    let newLookup = { ...ctxt.docIdLookupByDocName };

    let newLinksArray = $updateLinksPageNames.map(page => {
      let lookupResult = ctxt.docIdLookupByDocName[page]
      if (lookupResult) {
        return lookupResult;
      }

      // FIXME: duplicates some from createDocAction
      let newDoc = createNewDocument(page, 'TODO', copyDocs);
      let newId = newDoc.id;
      copyDocs[newId] = newDoc;
      newDisplayDocs.push(newId);
      newLookup[page] = newId;
      return newId;
    });
    let _newLinks = new Set(newLinksArray);

    // TODO: create page named `page`
    return {
      documents: copyDocs,
      displayDocs: newDisplayDocs,
      docIdLookupByDocName: newLookup
    };
  });




  /*** service and state ***/

  let dataMgr = new DataManager(new DataStore);
  let initContext = makeInitContextFromDocuments(dataMgr.getDocuments());

  let machine = createMachine(
    initContext,
    navigateToDocAction,
    importDocsAction,
    saveDocNameAction,
    saveDocEntryAction,
    saveFullCursorAction,
    saveCursorColIdAction,
    backspaceAction,
    collapseEntryAction,
    expandEntryAction,
    savePastedEntriesAction,
    updateEntryLinksAction
  );

  const { state: machineState, send: machineSend } = useMachine(machine);

  /*** history ***/

  function route(pathname) {
    if (pathname === "/") {
      machineSend("GO_HOME");
      return;
    }
    if (pathname === "/create") {
      machineSend("CREATE_DOC");
      return;
    }
    if (pathname.startsWith("/page/")) {
      let pageName = pathname.substring(6);
      // TODO: build an index instead
      if (pageName in $machineState.context.docIdLookupByDocName) {
        let docId = $machineState.context.docIdLookupByDocName[pageName];
        currentHashId = parseInt(docId);
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
      currentHashId = parseResult;
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
        // TODO: convert tree objects to FlowyTrees
        fileUploadObj = newFileUploadObj;
        machineSend("IMPORT_DOCS");
      } catch (err) {
        // TODO: show error to UI
        console.log("TODO: file is not a valid JSON object, err = ", err);
      }
    });
  }

  function handleStartEditingDocName() {
    machineSend("START_EDITING_NAME");
  }

  function handleCancelEditingDocName() {
    machineSend("CANCEL_EDITING_NAME");
  }

  function handleSaveDocName(docNameText) {
    nextDocName.set(docNameText);
    machineSend("SAVE_DOC_NAME");
  }

  function handleSaveDocEntry(entryText, colId) {
    nextDocEntryText.set(entryText);
    nextDocCursorColId.set(colId);
    machineSend("SAVE_DOC_ENTRY");
  }

  function handleSaveFullCursor(entryId, colId) {
    nextDocCursorEntryId.set(entryId);
    nextDocCursorColId.set(colId);
    machineSend("SAVE_FULL_CURSOR");
  }

  function handleSaveCursorColId(colId) {
    nextDocCursorColId.set(colId);
    machineSend("SAVE_CURSOR_COL_ID");
  }

  function handleGoUp() {
    machineSend("UP");
  }
  function handleGoDown() {
    machineSend("DOWN");
  }
  function handleEntryBackspace() {
    machineSend("ENTRY_BACKSPACE");
  }
  function handleCollapseEntry(entryId) {
    if (entryId !== null) {
      collapseExpandEntryId.set(entryId);
    }
    machineSend("COLLAPSE_ENTRY");
  }
  function handleExpandEntry(entryId) {
    if (entryId !== null) {
      collapseExpandEntryId.set(entryId);
    }
    machineSend("EXPAND_ENTRY");
  }
  function handleSplitEntry() {
    machineSend("SPLIT_ENTRY");
  }
  function handleIndent() {
    machineSend("INDENT");
  }
  function handleDedent() {
    machineSend("DEDENT");
  }
  function handleMultilinePaste(entryText) {
    nextDocEntryText.set(entryText);
    machineSend("SAVE_PASTED_ENTRIES");
  }
  function handleUpdateEntryLinks(entryId, linkedPages) {
    updateLinksEntryId.set(entryId);
    updateLinksPageNames.set(linkedPages);
    machineSend("UPDATE_ENTRY_LINKS");
  }

  // save the latest document
  $: dataMgr.saveDocuments($machineState.context.documents);

  //$: isAtTop = machineState.value.flowiki === "top";
  $: isAtTop = $machineState.matches("flowiki.top");

  $: displayDocs = $machineState.context.displayDocs.map(id => {
    return $machineState.context.documents[id];
  });

  $: currentTree =
    $machineState.context.currentDocId !== null
      ? $machineState.context.documents[$machineState.context.currentDocId].tree
      : null;

  $: currentTreeRoot = (currentTree && currentTree.getRoot()) || null;

  $: docIsEditingName = (() => {
    let curr = $machineState.value.flowiki;
    if (!isObject(curr)) {
      return docIsEditingName;
    }
    return curr.document.docTitle === "editing";
  })();

  $: if (history.location.pathname === "/create" && typeof $machineState.context.currentDocId === "number") {
    history.replace(`/${$machineState.context.currentDocId}`);
  }
</script>

<style>
  header {
    font-size: 1.1em;
    font-weight: bold;
    margin-top: 1.5em;
    border-bottom: 2px solid #666;
    margin-bottom: 0.3em;
    font-family: Consolas, "Andale Mono WT", "Andale Mono", "Lucida Console",
      "Lucida Sans Typewriter", "DejaVu Sans Mono", "Bitstream Vera Sans Mono",
      "Liberation Mono", "Nimbus Mono L", Monaco, "Courier New", Courier,
      monospace;
  }

  .home {
    font-size: 1.2em;
  }

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
  <header>
    <span class="home">🏠</span>
  </header>
  <Top {displayDocs} {createDoc} />
{:else}
  <header>
    <span class="home">
      <a href="#/">🏠</a>
    </span>
    &gt;
  </header>
  <Document
    tree={currentTree}
    flowyTreeNode={currentTreeRoot}
    docCursorEntryId={$machineState.context.docCursorEntryId}
    docCursorColId={$machineState.context.docCursorColId}
    docTitle={$machineState.context.docTitle}
    {docIsEditingName}
    {handleStartEditingDocName}
    {handleCancelEditingDocName}
    {handleGoUp}
    {handleGoDown}
    {handleCollapseEntry}
    {handleExpandEntry}
    {handleSplitEntry}
    {handleEntryBackspace}
    {handleIndent}
    {handleDedent}
    {handleMultilinePaste}
    {handleSaveCursorColId}
    {handleSaveDocName}
    {handleSaveDocEntry}
    {handleSaveFullCursor}
    {handleUpdateEntryLinks}
    />
{/if}

<div id="actions-bar">
  <Icon data={faHammer} scale="1" />
  <button on:click={downloadData}>export</button>

  <button on:click={uploadData}>import</button>
</div>
<input id="import-docs" type="file" on:change={handleDocsImport} />
