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
    };
  });

  /*** service and state ***/

  let machine = createMachine(navigateToNodeAction);
  let machineState = machine.initialState;

  const flowikiService = interpret(machine);
  flowikiService.onTransition(state => {
    console.log("transitioning to context = ", state.context, ", state = ", state.value);
    machineState = state;
  });
  flowikiService.start();

  /*** history ***/

  const history = createHashHistory();

  // Listen for changes to the current location.
  const unlisten = history.listen((location, action) => {
    // location is an object like window.location
    console.log(action, location.pathname, location.state);

    if (!location.pathname.startsWith('/')) {
      return;
    }

    console.log("location change with pathname = ", location.pathname);
    let newId = location.pathname.substring(1);

    if (newId === '') {
      flowikiService.send('GO_HOME');
      return;
    }

    let parseResult = parseInt(newId);
    if (!isNaN(parseResult)) {
      currentHashId = parseResult;
      flowikiService.send('NAVIGATE');
    } else {
      flowikiService.send('GO_HOME');
    }

  });


  /*** event handlers & some reactive variables ***/

  function createNode() {
    flowikiService.send('CREATE_NODE');
  }

  console.log("+++machineState = ", machineState);
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
  <Node entries={displayNodeEntries} />
{/if}
