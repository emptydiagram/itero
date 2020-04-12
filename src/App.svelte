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

  let navigateToNodeAction = assign(ctxt => {
    let nodeId = currentHashId;
    let entries = ctxt.nodes[nodeId].entries;
    return {
      currentNodeId: nodeId,
      displayNodeEntries: entries,
      nodeCursorId: entries.length - 1,
    };
  });

  let goUpAction = assign(ctxt => {
    return {
      nodeCursorId: ctxt.nodeCursorId === 0 ? 0 : ctxt.nodeCursorId - 1
    };
  });
  let goDownAction = assign(ctxt => {
    return {
      nodeCursorId: ctxt.nodeCursorId >= displayNodeEntries.length - 1 ? ctxt.nodeCursorId : ctxt.nodeCursorId + 1
    };
  });

  let createEntryBelowAction = assign(ctxt => {
    let nodeCursorId = ctxt.nodeCursorId;
    let newNodeEntries = ctxt.displayNodeEntries.splice(nodeCursorId+1, 0, 'TODO');
    console.log("createEntryBelowAction, new entries = ", newNodeEntries);
    return {
      nodeCursorId: nodeCursorId + 1,
      displayNewEntries: newNodeEntries,
    };
  });

  /*** service and state ***/

  let machine = createMachine(goUpAction, goDownAction, createEntryBelowAction, navigateToNodeAction);
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
    history.push('/create');
  }

  function handleKeyup(event) {
    console.log("key up, event = ", event);
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

</script>

<style>
  h1 {
  }
</style>

<svelte:window on:keyup={handleKeyup} />

<h1>treacle</h1>

{#if isAtTop}
  <Top
    displayNodes={displayNodes}
    createNode={createNode}
  />
{:else}
  <Node
    entries={displayNodeEntries}
    nodeCursorId={machineState.context.nodeCursorId}
  />
{/if}
