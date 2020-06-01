<script>
  import { createHashHistory } from "history";
  import { onMount } from "svelte";
  import { assign, interpret } from "xstate";
  import Document from "./Document.svelte";
  import Top from "./Top.svelte";
  import FlowyTree from "./FlowyTree.js";
  import DataStore from "./DataStore.js";
  import createMachine from "./machine.js";
  import { DataManager, makeInitContextFromDocuments } from "./data.js";

  function findRenderedEntryParent(initNode) {
    let currNode = initNode;
    while (currNode != null
        && !(currNode.className != null && currNode.className.includes("rendered-entry"))) {
      currNode = currNode.parentNode;
    }
    return currNode;
  }

  onMount(() => {
    document.addEventListener('selectionchange', (ev) => {
      let sel = document.getSelection();
      console.log("selectchange, anchorNode = ", sel.anchorNode);
      const renderedEntryNode = findRenderedEntryParent(sel.anchorNode);
      if (renderedEntryNode == null) {
        return;
      }
      console.log("selectchange, reNode = ", renderedEntryNode);
      /*
      let parentNode = sel.anchorNode.parentNode;
      console.log("selectchange, parentNode = ", parentNode);
      console.log("selectchange, parentNode.parentNode = ", parentNode.parentNode);
      console.log("selectchange, parentNode.parentNode.parentNode = ", parentNode.parentNode.parentNode);
      console.log("selectchange, parentNode.parentNode.parentNode.parentNode = ", parentNode.parentNode.parentNode.parentNode);
      console.log("selectchange, parentNode.parentNode.parentNode.parentNode.parentNode = ", parentNode.parentNode.parentNode.parentNode.parentNode);
      console.log("selectchange, parentNode.parentNode.parentNode.parentNode.parentNode.parentNode = ", parentNode.parentNode.parentNode.parentNode.parentNode.parentNode);
      */

      // TODO: find the index of anchorNode within parentNode.childNodes
      // given 1) rendered-entry childNodes, 2) the anchorNode, 3) the anchorOffset
      // return the column id corresponding to the click position
      let newColId = sel.anchorOffset;

      console.log("selectchange, data-entryId = ", renderedEntryNode.dataset.entryId);
      let newEntryId = parseInt(renderedEntryNode.dataset.entryId);
      console.log("selectchange, anchorOffset = ", sel.anchorOffset)
      handleSaveFullCursor(newEntryId, newColId);
      /*
      let theSpan = document.getElementById("the-span");
      if (theSpan && sel.anchorNode === theSpan.firstChild) {
        selStart = sel.anchorOffset;
        isEditing = true;
        isToggling = true;
      } else {
        console.log("skipping OSC");
      }
      */
    });

  });

  let currentHashId;
  let currentDocNameTextEntry;
  let currentDocEntryText;
  let currentCursorEntryId;
  let currentCursorColId;

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

  let saveDocNameAction = assign(ctxt => {
    let copyDocs = { ...ctxt.documents };

    let i = ctxt.currentDocId;
    copyDocs[i] = { ...ctxt.documents[i] };
    copyDocs[i].name = currentDocNameTextEntry;

    return {
      documents: copyDocs,
      docTitle: currentDocNameTextEntry
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
    newTree.setEntryText(j, currentDocEntryText);
    return {
      documents: copyDocs,
      docCursorColId: currentCursorColId
    };
  });

  // the action of SAVE_FULL_CURSOR
  let saveFullCursorAction = assign(_ctxt => {
    return {
      docCursorEntryId: currentCursorEntryId,
      docCursorColId: currentCursorColId
    };
  });

  let saveCursorColIdAction = assign(_ctxt => {
    return {
      docCursorColId: currentCursorColId
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
      let newEntry =
        currEntryText.substring(0, colId - 1) + currEntryText.substring(colId);
      currentDoc.tree.setEntryText(ctxt.docCursorEntryId, newEntry);

      currentCursorColId = colId - 1;
      return {
        docCursorColId: colId - 1,
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
      currentCursorColId = newColId;
      return {
        docCursorEntryId: newEntryId,
        docCursorColId: newColId,
        documents: newDocs
      };
    }
  });


  /*** service and state ***/

  let dataMgr = new DataManager(new DataStore);
  let initContext = makeInitContextFromDocuments(dataMgr.getDocuments());

  let machine = createMachine(
    initContext,
    navigateToDocAction,
    saveDocNameAction,
    saveDocEntryAction,
    saveFullCursorAction,
    saveCursorColIdAction,
    backspaceAction
  );
  let machineState = machine.initialState;

  const flowikiService = interpret(machine);

  flowikiService.onTransition(state => {
    console.log("-------------------");
    console.log(
      "transitioning to context = ",
      state.context,
      ", state = ",
      state.value
    );
    machineState = state;

    // TODO: save context.documents in local storage?
    dataMgr.saveDocuments(state.context.documents);
  });
  flowikiService.start();

  /*** history ***/

  function route(pathname) {
    let newId = pathname.substring(1);
    if (newId === "") {
      flowikiService.send("GO_HOME");
      return;
    }
    if (newId === "create") {
      flowikiService.send("CREATE_DOC");
      return;
    }

    let parseResult = parseInt(newId);
    if (!isNaN(parseResult)) {
      currentHashId = parseResult;
      flowikiService.send("NAVIGATE");
    } else {
      flowikiService.send("GO_HOME");
    }
  }

  const history = createHashHistory();

  // Listen for changes to the current location.
  const _unlisten = history.listen((location, action) => {
    // location is an object like window.location
    console.log(action, location.pathname, location.state);

    if (!location.pathname.startsWith("/")) {
      return;
    }

    route(location.pathname);
  });

  /*** event handlers & some reactive variables ***/

  function createDoc() {
    // navigate to #/create
    history.push("/create");
  }

  function handleStartEditingDocName() {
    flowikiService.send("START_EDITING_NAME");
  }

  function handleCancelEditingDocName() {
    flowikiService.send("CANCEL_EDITING_NAME");
  }

  function handleSaveDocName(docNameText) {
    currentDocNameTextEntry = docNameText;
    flowikiService.send("SAVE_DOC_NAME");
  }

  function handleSaveDocEntry(entryText, colId) {
    currentDocEntryText = entryText;
    currentCursorColId = colId;
    flowikiService.send("SAVE_DOC_ENTRY");
  }

  function handleSaveFullCursor(entryId, colId) {
    currentCursorEntryId = entryId;
    currentCursorColId = colId;
    flowikiService.send("SAVE_FULL_CURSOR");
  }

  function handleSaveCursorColId(colId) {
    currentCursorColId = colId;
    flowikiService.send("SAVE_CURSOR_COL_ID");
  }

  function handleGoUp() {
    flowikiService.send("UP");
  }
  function handleGoDown() {
    flowikiService.send("DOWN");
  }
  function handleEntryBackspace() {
    flowikiService.send("ENTRY_BACKSPACE");
  }
  function handleCollapseEntry() {
    flowikiService.send("COLLAPSE_ENTRY");
  }
  function handleExpandEntry() {
    flowikiService.send("EXPAND_ENTRY");
  }
  function handleSplitEntry() {
    flowikiService.send("SPLIT_ENTRY");
  }
  function handleIndent() {
    flowikiService.send("INDENT");
  }
  function handleDedent() {
    flowikiService.send("DEDENT");
  }

  $: isAtTop = machineState.value.flowiki === "top";

  $: displayDocs = machineState.context.displayDocs.map(id => {
    return machineState.context.documents[id];
  });

  $: currentTree =
    machineState.context.currentDocId !== null
      ? machineState.context.documents[machineState.context.currentDocId].tree
      : null;

  $: currentTreeRoot = (currentTree && currentTree.getRoot()) || null;

  $: docIsEditingName = (() => {
    let curr = machineState.value.flowiki;
    if (!isObject(curr)) {
      return docIsEditingName;
    }
    return curr.document.docTitle === "editing";
  })();
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
    docCursorEntryId={machineState.context.docCursorEntryId}
    docCursorColId={machineState.context.docCursorColId}
    docTitle={machineState.context.docTitle}
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
    {handleSaveCursorColId}
    {handleSaveDocName}
    {handleSaveDocEntry}
    {handleSaveFullCursor} />
{/if}
