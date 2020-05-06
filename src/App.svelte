<script>
  import { createHashHistory } from 'history';
  import { assign, interpret } from 'xstate';
  import Node from './Node.svelte';
  import Top from './Top.svelte';
  import createMachine from './machine.js';

  const ENTER_KEYCODE = 13;
  const ARROW_LEFT_KEYCODE = 37;
  const ARROW_UP_KEYCODE = 38;
  const ARROW_RIGHT_KEYCODE = 39;
  const ARROW_DOWN_KEYCODE = 40;
  const HOME_KEYCODE = 36;
  const END_KEYCODE = 35;
  const CURSOR_POS_CHANGE_KEYCODES = [ARROW_LEFT_KEYCODE, ARROW_RIGHT_KEYCODE, HOME_KEYCODE, END_KEYCODE]
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
    let entries = node.entries;
    let initRowId = entries.length - 1;
    return {
      currentNodeId: nodeId,
      nodeCursorRowId: initRowId,
      nodeTitle: node.name,
      nodeEntry: entries[initRowId]
    };
  });


  let saveNodeNameAction = assign(ctxt => {
    let copyNodes = {...ctxt.nodes};

    let i = ctxt.currentNodeId;
    copyNodes[i] = {...ctxt.nodes[i]};
    copyNodes[i].name = currentNodeNameTextEntry;

    return {
      nodes: copyNodes,
      nodeTitle: currentNodeNameTextEntry,
    };

  });

  let saveNodeEntryAction = assign(ctxt => {
    let copyNodes = {...ctxt.nodes};
    let i = ctxt.currentNodeId;
    let j = ctxt.nodeCursorRowId;
    copyNodes[i] = {...ctxt.nodes[i]};
    copyNodes[i].entries = [...copyNodes[i].entries];
    copyNodes[i].entries[j] = currentNodeEntryText;
    return {
      nodes: copyNodes
    };
  });

  let saveFullCursorAction = assign(ctxt => {
    return {
      nodeCursorRowId: currentCursorRowId,
      nodeCursorColId: currentCursorColId,
      nodeEntry: ctxt.nodes[ctxt.currentNodeId].entries[currentCursorRowId]
    };
  });

  let saveCursorColIdAction = assign(ctxt => {
    return {
      nodeCursorColId: currentCursorColId
    };
  });



  /*** service and state ***/

  let machine = createMachine(navigateToNodeAction, saveNodeNameAction, saveNodeEntryAction, saveFullCursorAction, saveCursorColIdAction);
  let machineState = machine.initialState;

  const flowikiService = interpret(machine);
  flowikiService.onTransition(state => {
    console.log("transitioning to context = ", state.context, ", state = ", state.value);
    machineState = state;
  });
  flowikiService.start();

  /*** history ***/

  function route(pathname) {
    let newId = pathname.substring(1);
    if (newId === '') {
      flowikiService.send('GO_HOME');
      return;
    }
    if (newId === 'create') {
      flowikiService.send('INIT_CREATE_NODE');
      return;
    }

    let parseResult = parseInt(newId);
    if (!isNaN(parseResult)) {
      currentHashId = parseResult;
      flowikiService.send('NAVIGATE');
    } else {
      flowikiService.send('GO_HOME');
    }
  }


  const history = createHashHistory();

  // Listen for changes to the current location.
  const unlisten = history.listen((location, action) => {
    // location is an object like window.location
    console.log(action, location.pathname, location.state);

    if (!location.pathname.startsWith('/')) {
      return;
    }

    route(location.pathname)
  });


  /*** event handlers & some reactive variables ***/

  function createNode() {

    // navigate to #/create
    history.push('/create');
  }

  function handleStartEditingNodeName() {
    flowikiService.send('START_EDITING_NAME');
  }

  function handleCancelEditingNodeName() {
    flowikiService.send('CANCEL_EDITING_NAME');
  }

  function handleSaveNodeName(nodeNameText) {
    currentNodeNameTextEntry = nodeNameText;
    flowikiService.send('SAVE_NODE_NAME');
  }

  function handleSaveNodeEntry(entryText) {
    currentNodeEntryText = entryText;
    flowikiService.send('SAVE_NODE_ENTRY');
  }

  function handleSaveFullCursor(rowId, colId) {
    currentCursorRowId = rowId;
    currentCursorColId = colId;
    flowikiService.send('SAVE_FULL_CURSOR');
  }

  function handleSaveCursorColId(colId) {
    currentCursorColId = colId;
    flowikiService.send('SAVE_CURSOR_COL_ID');
  }

  function handleKeyup(event) {
    // console.log("key up, event = ", event);
    if (event.keyCode === ENTER_KEYCODE) {
      flowikiService.send('CREATE_ENTRY_BELOW');
    } else if(event.keyCode === ARROW_UP_KEYCODE) {
      if (!atFirst) {
        flowikiService.send('UP');
      }
    } else if(event.keyCode === ARROW_DOWN_KEYCODE) {
      if (!atLast) {
        flowikiService.send('DOWN');
      }
    } else if (CURSOR_POS_CHANGE_KEYCODES.indexOf(event.keyCode) > -1) {
      // TODO: check whether i'm in node/top instead
      let el = document.getElementById("text-input");
      if (el) {
        handleSaveCursorColId(el.selectionStart);
      }
    }
  }

  // console.log("+++machineState = ", machineState);
  $: isAtTop = machineState.value.flowiki === 'top';

  $: displayNodes = machineState.context.displayNodes.map(id => {
    return machineState.context.nodes[id];
  });

  $: displayNodeEntries = (machineState.context.currentNodeId !== null
    ? machineState.context.nodes[machineState.context.currentNodeId].entries
    : [""]);

  $: atFirst = machineState.context.nodeCursorRowId === 0;
  $: atLast = machineState.context.nodeCursorRowId === displayNodeEntries.length - 1;

  $: nodeIsEditingName = (() => {
    let curr = machineState.value.flowiki;
    if (!isObject(curr)) {
      return nodeIsEditingName
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
    font-family: Consolas, "Andale Mono WT", "Andale Mono", "Lucida Console", "Lucida Sans Typewriter", "DejaVu Sans Mono", "Bitstream Vera Sans Mono", "Liberation Mono", "Nimbus Mono L", Monaco, "Courier New", Courier, monospace;
  }

  #home-link {
    font-size: 1.2em;
  }
</style>

<svelte:window on:keyup={handleKeyup} />



{#if isAtTop}
  <header>
    <span>notes</span>
  </header>
  <Top
    displayNodes={displayNodes}
    createNode={createNode}
  />
{:else}
  <header>
    <span id="home-link"><a href="#/">🏠</a></span> &gt;
  </header>
  <Node
    entries={displayNodeEntries}
    nodeCursorRowId={machineState.context.nodeCursorRowId}
    nodeCursorColId={machineState.context.nodeCursorColId}
    nodeTitle={machineState.context.nodeTitle}
    nodeEntry={machineState.context.nodeEntry}
    nodeIsEditingName={nodeIsEditingName}
    handleStartEditingNodeName={handleStartEditingNodeName}
    handleCancelEditingNodeName={handleCancelEditingNodeName}
    handleSaveNodeName={handleSaveNodeName}
    handleSaveNodeEntry={handleSaveNodeEntry}
    handleSaveFullCursor={handleSaveFullCursor}
    handleSaveCursorColId={handleSaveCursorColId}
  />
{/if}
