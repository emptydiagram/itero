<script>
  import { createHashHistory } from 'history';
  import { assign, interpret } from 'xstate';
  import Node from './Node.svelte';
  import Top from './Top.svelte';
  import createMachine from './machine.js';

  let currentHashId;

  let navigateToNodeAction = assign(ctxt => {
    let nodeId = currentHashId;
    let entries = ctxt.nodes[nodeId].entries;
    console.log('navigate to  node, entries = ', entries);
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

  /*** service and state ***/

  let machine = createMachine(goUpAction, goDownAction, navigateToNodeAction);
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

    console.log("location change with pathname = ", location.pathname);
    route(location.pathname)
  });


  /*** event handlers & some reactive variables ***/

  function createNode() {
    history.push('/create');
  }
  function nodeGoUp() {
    flowikiService.send('UP');
  }
  function nodeGoDown() {
    flowikiService.send('DOWN');
  }

  // console.log("+++machineState = ", machineState);
  $: isAtTop = machineState.value.flowiki === 'top';

  $: displayNodes = machineState.context.displayNodes.map(id => {
    return machineState.context.nodes[id];
  });

  $: displayNodeEntries = machineState.context.displayNodeEntries;

</script>

<style>
  h1 {
  }
</style>

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
    goUp={nodeGoUp}
    goDown={nodeGoDown}
  />
{/if}
