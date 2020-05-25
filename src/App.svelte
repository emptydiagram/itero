<script>
  import { createHashHistory } from "history";
  import { assign, interpret } from "xstate";
  import Document from "./Document.svelte";
  import Top from "./Top.svelte";
  import FlowyTree from "./FlowyTree.js";
  import DataStore from "./DataStore.js";
  import createMachine from "./machine.js";
  import { nodeToTreeObj } from "./serialization.js";

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
    let initEntryId = doc.tree.size - 1;
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
    newTree.setEntry(j, currentDocEntryText);
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
      let currEntry = currentDoc.tree.getEntry(ctxt.docCursorEntryId);
      let newEntry =
        currEntry.substring(0, colId - 1) + currEntry.substring(colId);
      currentDoc.tree.setEntry(ctxt.docCursorEntryId, newEntry);

      currentCursorColId = colId - 1;
      return {
        docCursorColId: colId - 1,
        documents: copyDocs
      };
    }

    // col is zero, so we merge adjacent entries
    let currTree = ctxt.documents[ctxt.currentDocId].tree;
    let entryId = ctxt.docCursorEntryId;
    if (currTree.hasEntryAbove(entryId)) {
      let prevEntryId = currTree.getEntryIdAbove(entryId);

      let newDocs;
      newDocs = { ...ctxt.documents };
      let docId = ctxt.currentDocId;
      let currDoc = newDocs[docId];

      let prevRowOrigEntryLen = currDoc.tree.getEntry(prevEntryId).length;

      currentDoc.tree = new FlowyTree(
        currDoc.tree.getEntries(),
        currDoc.tree.getRoot()
      );

      let currEntry = currDoc.tree.getEntry(entryId);
      currDoc.tree.deleteAt(entryId);
      currDoc.tree.setEntry(
        prevEntryId,
        currDoc.tree.getEntry(prevEntryId) + currEntry
      );

      // NOTE: we *set* currentCursorColId here.
      currentCursorColId = prevRowOrigEntryLen;
      return {
        docCursorEntryId: prevEntryId,
        docCursorColId: prevRowOrigEntryLen,
        documents: newDocs
      };
    }
  });

  let dataStore = new DataStore();

  function treeToSerializationObject(tree) {
    return {
      entries: tree.getEntries(),
      node: nodeToTreeObj(tree.getRoot())
    };
  }

  function documentToSerializationObject(doc) {
    let newDoc = { ...doc };
    newDoc.tree = treeToSerializationObject(newDoc.tree);
    return newDoc;
  }

  // documents: Map<EntryId, Document>
  // where type Document = {id: EntryId, name: String, tree: FlowyTree }
  function saveDocuments(documents) {
    let serDocs = {};
    Object.entries(documents).forEach(([entryId, doc]) => {
      serDocs[entryId] = documentToSerializationObject(doc);
    });
    dataStore.set("innecto-docs", JSON.stringify(serDocs));
  }

  /*** service and state ***/

  let machine = createMachine(
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
    saveDocuments(state.context.documents);
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

  #home-link {
    font-size: 1.2em;
  }
</style>

{#if isAtTop}
  <header>
    <span>notes</span>
  </header>
  <Top {displayDocs} {createDoc} />
{:else}
  <header>
    <span id="home-link">
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
    {handleSplitEntry}
    {handleEntryBackspace}
    {handleIndent}
    {handleDedent}
    {handleSaveCursorColId}
    {handleSaveDocName}
    {handleSaveDocEntry}
    {handleSaveFullCursor} />
{/if}
