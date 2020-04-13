<script>
  import { createHashHistory } from 'history';
  import { assign, interpret } from 'xstate';
  import Node from './Node.svelte';
  import Top from './Top.svelte';
  import createMachine from './machine.js';

  const ENTER_KEYCODE = 13;
  const ARROW_UP_KEYCODE = 38;
  const ARROW_DOWN_KEYCODE = 40;
  let currentHashId;
  let currentNodeNameTextEntry;

  function isObject(obj) {
    return obj === Object(obj);
  }

  let navigateToNodeAction = assign(ctxt => {
    let nodeId = currentHashId;
    let node = ctxt.nodes[nodeId];
    let entries = node.entries;
    return {
      currentNodeId: nodeId,
      displayNodeEntries: entries,
      nodeCursorId: entries.length - 1,
      nodeName: node.name,
    };
  });

  let saveNodeNameAction = assign(ctxt => {
    let copyNodes = {...ctxt.nodes};
    let i = ctxt.currentNodeId;
    copyNodes[i] = {...ctxt.nodes[i]};
    copyNodes[i].name = currentNodeNameTextEntry;

    return {
      nodes: copyNodes,
      nodeName: currentNodeNameTextEntry,
    };
  });


  /*** service and state ***/

  let machine = createMachine(navigateToNodeAction, saveNodeNameAction);
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
      flowikiService.send('CREATE_NODE');
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
    flowikiService.send('START_EDITING_NAME');
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

  function handleKeyup(event) {
    // console.log("key up, event = ", event);
    if (event.keyCode === ENTER_KEYCODE) {
      const cursor = machineState.context.nodeCursorId;
      // console.log("+++ machineState = ", machineState.context);
      console.log("enter! cursor = "+cursor);

      flowikiService.send('CREATE_ENTRY_BELOW');
    } else if(event.keyCode === ARROW_UP_KEYCODE) {
      if (!atFirst) {
        flowikiService.send('UP');
      }
    } else if(event.keyCode === ARROW_DOWN_KEYCODE) {
      if (!atLast) {
        flowikiService.send('DOWN');
      }
    }
  }

  // console.log("+++machineState = ", machineState);
  $: isAtTop = machineState.value.flowiki === 'top';

  $: displayNodes = machineState.context.displayNodes.map(id => {
    return machineState.context.nodes[id];
  });

  $: displayNodeEntries = machineState.context.displayNodeEntries;

  $: atFirst = machineState.context.nodeCursorId === 0;
  $: atLast = machineState.context.nodeCursorId === displayNodeEntries.length - 1;

  $: nodeIsEditingName = (() => {
    let curr = machineState.value.flowiki;
    if (!isObject(curr)) {
      return nodeIsEditingName
    }
    return curr.node.nodeName === "editing";
  })();

</script>

<style>
  header {
    margin-top: 1.5em;
    border-bottom: 2px solid #666;
    margin-bottom: 0.5em;
  }

  h1 {
    font-size: 0.9em;
    font-family: Consolas, "Andale Mono WT", "Andale Mono", "Lucida Console", "Lucida Sans Typewriter", "DejaVu Sans Mono", "Bitstream Vera Sans Mono", "Liberation Mono", "Nimbus Mono L", Monaco, "Courier New", Courier, monospace;
  }
</style>

<svelte:window on:keyup={handleKeyup} />


<header>
  <h1>treacle</h1>
</header>

{#if isAtTop}
  <Top
    displayNodes={displayNodes}
    createNode={createNode}
  />
{:else}
  <Node
    entries={displayNodeEntries}
    nodeCursorId={machineState.context.nodeCursorId}
    nodeName={machineState.context.nodeName}
    nodeIsEditingName={nodeIsEditingName}
    handleStartEditingNodeName={handleStartEditingNodeName}
    handleCancelEditingNodeName={handleCancelEditingNodeName}
    handleSaveNodeName={handleSaveNodeName}
  />
{/if}
