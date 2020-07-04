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
      handleSaveFullCursor(newEntryId, newColId);
    });

    // handle initial navigation to a page
    if (location.hash.startsWith("#/")) {
      route(location.hash.substring(1));
    }

  });

  let fileUploadObj;

  const history = createHashHistory();


  function isObject(obj) {
    return obj === Object(obj);
  }

  function initDocStoreFromInitContext(initContext) {
    docsStore.init(initContext.documents, initContext.docIdLookupByDocName);
  }

  let importDocsAction = assign(_ctxt => {
    let initContext = makeInitContextFromDocuments(fileUploadObj);
    initDocStoreFromInitContext(initContext);
    return initContext;
  });

  let saveDocNameAction = assign(ctxt => {
    let copyDocs = { ...ctxt.documents };

    let i = $docsStore.currentDocId;
    copyDocs[i] = { ...ctxt.documents[i] };
    let oldDocName = copyDocs[i].name;
    copyDocs[i].name = $docsStore.docName;

    docsStore.removeDocIdLookup(oldDocName);
    docsStore.putDocIdLookup($docsStore.docName, $docsStore.currentDocId);

    return {
      documents: copyDocs,
    };
  });

  let saveDocEntryAction = assign(ctxt => {
    let copyDocs = { ...ctxt.documents };
    let i = $docsStore.currentDocId;
    let j = $docsStore.cursorEntryId;
    copyDocs[i] = { ...ctxt.documents[i] };
    let newTree = new FlowyTree(
      copyDocs[i].tree.getEntries(),
      copyDocs[i].tree.getRoot()
    );
    copyDocs[i].tree = newTree;
    newTree.setEntryText(j, $docsStore.nextDocEntryText);
    return {
      documents: copyDocs,
    };
  });


  let backspaceAction = assign(ctxt => {
    let copyDocs = { ...ctxt.documents };
    let currentDoc = copyDocs[$docsStore.currentDocId];
    currentDoc.tree = new FlowyTree(
      currentDoc.tree.getEntries(),
      currentDoc.tree.getRoot()
    );
    let colId = $docsStore.cursorColId;
    let entryId = $docsStore.cursorEntryId;

    if (colId > 0) {
      let currEntryText = currentDoc.tree.getEntryText(entryId);
      let currTextLength = currEntryText.length;
      // colId might be larger than the text length, so handle it
      let actualColId = Math.min(colId, currTextLength);
      let newEntry =
        currEntryText.substring(0, actualColId - 1) + currEntryText.substring(actualColId);
      currentDoc.tree.setEntryText(entryId, newEntry);

      docsStore.saveCursorColId(actualColId - 1);
      return {
        documents: copyDocs
      };
    }

    // col is zero, so we merge adjacent entries
    let currTree = ctxt.documents[$docsStore.currentDocId].tree;

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
      let docId = $docsStore.currentDocId;
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


      docsStore.saveCursor(newEntryId, newColId);
      return {
        documents: newDocs
      };
    }
  });


  let collapseEntryAction = assign(ctxt => {
    // check if display state is collapsed, and, if so, expand
    let docId = $docsStore.currentDocId;
    let entryId = $docsStore.collapseExpandEntryId;

    let newDocs = { ...ctxt.documents };
    let currDoc = newDocs[docId];
    let currTree = currDoc.tree;
    let currHasChildren = currTree.getEntryItem(entryId).value.hasChildren();

    if (currHasChildren && currTree.getEntryDisplayState(entryId) === EntryDisplayState.EXPANDED) {
      let newTree = new FlowyTree(currTree.getEntries(), currTree.getRoot());
      newTree.setEntryDisplayState(entryId, EntryDisplayState.COLLAPSED)
      currDoc.tree = newTree;

      return {
        documents: newDocs,
      };
    }

    return {};
  });

  let expandEntryAction = assign(ctxt => {
    // check if display state is collapsed, and, if so, expand
    let docId = $docsStore.currentDocId;
    let entryId = $docsStore.collapseExpandEntryId;

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
    let i = $docsStore.currentDocId;
    let entryId = $docsStore.cursorEntryId;
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
    $docsStore.nextDocEntryText.split('\n').forEach(line => {
      console.log("inserting below ", currEntryId, " line = ", line);
      currEntryId = newTree.insertEntryBelow(currEntryId, parentId, line);
    });
    return {
      documents: copyDocs,
    };
  });

  // given: sets a, b
  // returns: [elements removed from a, elements added to a]
  function diffSets(a, b) {
    let removed = [];
    let added = [];
    for (let [entry, _] of a.entries()) {
      if (!b.has(entry)) {
        removed.push(entry);
      }
    }
    for (let [entry, _] of b.entries()) {
      if (!a.has(entry)) {
        added.push(entry);
      }
    }
    return [removed, added];
  }

  // compute the diff between the current set of links and the new set
  //  - NOTE: we start with the new set of linked *page names*, so we need to look up doc ids
  //     - whenever we find a page name with no doc id, need to automatically create
  // for each removed and added link in the entry, update the link graph
  // return { updated LinkGraph, updated documents object }
  let updateEntryLinksAction = assign(ctxt => {
    let copyDocs = { ...ctxt.documents };

    let entryId = $docsStore.updateLinksEntryId;
    let currLinks = ctxt.linkGraph.getLinks($docsStore.currentDocId, entryId);

    let newLinksArray = $docsStore.updateLinksPageNames.map(page => {
      let lookupResult = $docsStore.docIdLookupByDocName[page];
      if (lookupResult) {
        return lookupResult;
      }

      // FIXME: duplicates some from createDocAction
      let newDoc = createNewDocument(page, 'TODO', copyDocs);
      let newId = newDoc.id;
      copyDocs[newId] = newDoc;
      docsStore.appendToDocsDisplayList(newId);
      docsStore.putDocIdLookup(page, newId);
      return newId;
    });
    let newLinks = new Set(newLinksArray);

    // diff currLinks, newLinks
    let [removed, added] = diffSets(currLinks, newLinks);
    console.log("updateEntryLinksAction, (removed, added) = ", removed, added);

    let newLinkGraph = ctxt.linkGraph;
    removed.forEach(docId => {
      newLinkGraph.removeLink($docsStore.currentDocId, entryId, docId);
    });
    added.forEach(docId => {
      newLinkGraph.addLink($docsStore.currentDocId, entryId, docId);
    });

    return {
      documents: copyDocs,
      linkGraph: newLinkGraph,
    };
  });




  /*** service and state ***/

  let dataMgr = new DataManager(new DataStore);
  let initContext = makeInitContextFromDocuments(dataMgr.getDocuments());
  initDocStoreFromInitContext(initContext);

  let machine = createMachine(
    initContext,
    importDocsAction,
    saveDocNameAction,
    saveDocEntryAction,
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
      if (pageName in $docsStore.docIdLookupByDocName) {
        let docId = $docsStore.docIdLookupByDocName[pageName];
        let doc = $machineState.context.documents[docId];
        let initEntryId = doc.tree.getTopEntryId();
        docsStore.saveCurrentDocId(docId);
        docsStore.saveDocName(doc.name);
        docsStore.saveCursorEntryId(initEntryId);
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
      let doc = $machineState.context.documents[docId];
      let initEntryId = doc.tree.getTopEntryId();
      docsStore.saveCurrentDocId(docId);
      docsStore.saveDocName(doc.name);
      docsStore.saveCursorEntryId(initEntryId);
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
    docsStore.saveDocName(docNameText);
    machineSend("SAVE_DOC_NAME");
  }

  function handleSaveDocEntry(entryText, colId) {
    docsStore.saveNextDocEntryText(entryText);
    docsStore.saveCursorColId(colId);
    machineSend("SAVE_DOC_ENTRY");
  }

  // TODO: just pass docsStore.saveCursor in instead of handleSaveFullCursor?
  function handleSaveFullCursor(entryId, colId) {
    docsStore.saveCursor(entryId, colId);
  }

  function handleSaveCursorColId(colId) {
    docsStore.saveCursorColId(colId);
  }

  function handleGoUp() {
    docsStore.entryGoUp($machineState.context.documents);
  }
  function handleGoDown() {
    docsStore.entryGoDown($machineState.context.documents);
  }
  function handleEntryBackspace() {
    machineSend("ENTRY_BACKSPACE");
  }
  function handleCollapseEntry(entryId) {
    if (entryId !== null) {
      $docsStore.saveCollapseExpandEntryId(entryId);
    }
    machineSend("COLLAPSE_ENTRY");
  }
  function handleExpandEntry(entryId) {
    if (entryId !== null) {
      $docsStore.saveCollapseExpandEntryId(entryId);
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
    console.log("handleUpdateEntryLinks, setting stores, entryId, linkedPages = ", entryId, linkedPages);
    docsStore.saveUpdateLinksEntryId(entryId);
    docsStore.saveUpdateLinksPageNames(linkedPages);
    machineSend("UPDATE_ENTRY_LINKS");
  }

  // TODO: move into getBacklinks?
  function makeBacklinksFromContext(context) {
    let backlinks = context.linkGraph.getBacklinks($docsStore.currentDocId);
    let backlinksObj = {};
    for (let [[docId, entryId], _] of backlinks.entries()) {
      if (!(docId in backlinksObj)) {
        backlinksObj[docId] = {
          id: docId,
          name: context.documents[docId].name,
          entries: {}
        };
      }
      backlinksObj[docId].entries[entryId] = {
        id: entryId,
        text: context.documents[docId].tree.getEntryText(entryId)
      };
    }
    return backlinksObj;
  }

  // save the latest document
  $: dataMgr.saveDocuments($machineState.context.documents);

  $: isAtTop = $machineState.matches("flowiki.top");

  $: displayDocs = $docsStore.docsDisplayList.map(id => {
    return $machineState.context.documents[id];
  });

  $: currentTree =
    $docsStore.currentDocId !== null
      ? $machineState.context.documents[$docsStore.currentDocId].tree
      : null;

  $: currentTreeRoot = (currentTree && currentTree.getRoot()) || null;

  $: docIsEditingName = (() => {
    let curr = $machineState.value.flowiki;
    if (!isObject(curr)) {
      return docIsEditingName;
    }
    return curr.document.docTitle === "editing";
  })();

  $: if (history.location.pathname === "/create" && typeof $docsStore.currentDocId === "number") {
    history.replace(`/${$docsStore.currentDocId}`);
  }

  $: backlinks = makeBacklinksFromContext($machineState.context);
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
    docCursorEntryId={$docsStore.cursorEntryId}
    docCursorColId={$docsStore.cursorColId}
    docTitle={$docsStore.docName}
    backlinks={makeBacklinksFromContext($machineState.context)}
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
