<script>
  import { createHashHistory } from "history";
  import { assign, interpret } from "xstate";
  import Document from "./Document.svelte";
  import Top from "./Top.svelte";
  import FlowyTree from "./FlowyTree.js";
  import createMachine from "./machine.js";

  let currentHashId;
  let currentNodeNameTextEntry;
  let currentNodeEntryText;
  let currentCursorRowId;
  let currentCursorColId;

  function isObject(obj) {
    return obj === Object(obj);
  }

  let navigateToNodeAction = assign(ctxt => {
    let nodeId = currentHashId;
    let node = ctxt.nodes[nodeId];
    let initRowId = node.doc.size() - 1;
    return {
      currentNodeId: nodeId,
      nodeCursorRowId: initRowId,
      nodeTitle: node.name
    };
  });

  let saveNodeNameAction = assign(ctxt => {
    let copyNodes = { ...ctxt.nodes };

    let i = ctxt.currentNodeId;
    copyNodes[i] = { ...ctxt.nodes[i] };
    copyNodes[i].name = currentNodeNameTextEntry;

    return {
      nodes: copyNodes,
      nodeTitle: currentNodeNameTextEntry
    };
  });

  let saveNodeEntryAction = assign(ctxt => {
    let copyNodes = { ...ctxt.nodes };
    let i = ctxt.currentNodeId;
    let j = ctxt.nodeCursorRowId;
    copyNodes[i] = { ...ctxt.nodes[i] };
    let newTree = new FlowyTree(copyNodes[i].doc.getEntries(), copyNodes[i].doc.getRoot());
    copyNodes[i].doc = newTree;
    newTree.setEntry(j, currentNodeEntryText);
    return {
      nodes: copyNodes,
      nodeCursorColId: currentCursorColId
    };
  });

  // the action of SAVE_FULL_CURSOR
  let saveFullCursorAction = assign(_ctxt => {
    return {
      nodeCursorRowId: currentCursorRowId,
      nodeCursorColId: currentCursorColId
    };
  });

  let saveCursorColIdAction = assign(_ctxt => {
    return {
      nodeCursorColId: currentCursorColId
    };
  });

  let backspaceAction = assign(ctxt => {
    let copyNodes = { ...ctxt.nodes };
    let currentNode = copyNodes[ctxt.currentNodeId];
    currentNode.doc = new FlowyTree(currentNode.doc.getEntries(), currentNode.doc.getRoot());
    let colId = ctxt.nodeCursorColId;

    if (colId > 0) {
      let currEntry = currentNode.doc.getEntry(ctxt.nodeCursorRowId);
      let newEntry =
        currEntry.substring(0, colId - 1) + currEntry.substring(colId);
      currentNode.doc.setEntry(ctxt.nodeCursorRowId, newEntry);

      currentCursorColId = colId - 1;
      return {
        nodeCursorColId: colId - 1,
        nodes: copyNodes
      };
    }

    // col is zero, so we merge adjacent entries
    let rowId = ctxt.nodeCursorRowId;
    if (rowId > 0) {
      let prevRowId = rowId - 1;

      let newNodes;
      newNodes = { ...ctxt.nodes };
      let nodeId = ctxt.currentNodeId;
      let currNode = newNodes[nodeId];

      let prevRowOrigEntryLen = currNode.doc.getEntry(prevRowId).length;

      currentNode.doc = new FlowyTree(currNode.doc.getEntries(), currNode.doc.getRoot());
      let currEntry = currNode.doc.getEntry(rowId);
      currNode.doc.deleteAt(rowId);
      currNode.doc.setEntry(
        prevRowId,
        currNode.doc.getEntry(prevRowId) + currEntry
      );

      // NOTE: we *set* currentCursorColId here.
      currentCursorColId = prevRowOrigEntryLen;
      return {
        nodeCursorRowId: prevRowId,
        nodeCursorColId: prevRowOrigEntryLen,
        nodes: newNodes
      };
    }
  });

  /*** service and state ***/

  let machine = createMachine(
    navigateToNodeAction,
    saveNodeNameAction,
    saveNodeEntryAction,
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
      flowikiService.send("INIT_CREATE_NODE");
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

  function createNode() {
    // navigate to #/create
    history.push("/create");
  }

  function handleStartEditingNodeName() {
    flowikiService.send("START_EDITING_NAME");
  }

  function handleCancelEditingNodeName() {
    flowikiService.send("CANCEL_EDITING_NAME");
  }

  function handleSaveNodeName(nodeNameText) {
    currentNodeNameTextEntry = nodeNameText;
    flowikiService.send("SAVE_NODE_NAME");
  }

  function handleSaveNodeEntry(entryText, colId) {
    currentNodeEntryText = entryText;
    currentCursorColId = colId;
    flowikiService.send("SAVE_NODE_ENTRY");
  }

  function handleSaveFullCursor(rowId, colId) {
    currentCursorRowId = rowId;
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

  $: isAtTop = machineState.value.flowiki === "top";

  $: displayNodes = machineState.context.displayNodes.map(id => {
    return machineState.context.nodes[id];
  });

  $: displayNodeEntries =
    machineState.context.currentNodeId !== null
      ? machineState.context.nodes[
          machineState.context.currentNodeId
        ].doc.getEntryTexts()
      : [""];

  $: nodeIsEditingName = (() => {
    let curr = machineState.value.flowiki;
    if (!isObject(curr)) {
      return nodeIsEditingName;
    }
    return curr.node.nodeTitle === "editing";
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
  <Top {displayNodes} {createNode} />
{:else}
  <header>
    <span id="home-link">
      <a href="#/">🏠</a>
    </span>
    &gt;
  </header>
  <Document
    entries={displayNodeEntries}
    nodeCursorRowId={machineState.context.nodeCursorRowId}
    nodeCursorColId={machineState.context.nodeCursorColId}
    nodeTitle={machineState.context.nodeTitle}
    {nodeIsEditingName}
    {handleStartEditingNodeName}
    {handleCancelEditingNodeName}
    {handleGoUp}
    {handleGoDown}
    {handleSplitEntry}
    {handleEntryBackspace}
    {handleSaveCursorColId}
    {handleSaveNodeName}
    {handleSaveNodeEntry}
    {handleSaveFullCursor} />
{/if}
