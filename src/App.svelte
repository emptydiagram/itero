<script>
  import { assign, interpret } from 'xstate';
  import Node from './Node.svelte';
  import Top from './Top.svelte';
  import createMachine from './machine.js';

  let currentNodeId;

  let viewNodeAction = assign(ctxt => {
    let nodeId = currentNodeId;
    let entries = ctxt.nodes[nodeId].entries;
    console.log('view node, entries = ', entries);
    return {
      currentNodeId: nodeId,
      displayNodeEntries: entries,
    };
  });

  let machine = createMachine(viewNodeAction);
  let machineState = machine.initialState;
  const flowikiService = interpret(machine);

  flowikiService.onTransition(state => {
    console.log("transitioning to context = ", state.context, ", state = ", state.value);
    machineState = state;
  });

  flowikiService.start();

  //console.log("+++machineState = ", machineState);
  $: isAtTop = machineState.value === 'top';

  function createNode() {
    flowikiService.send('CREATE_NODE');
  }
  function viewNode(id) {
    currentNodeId = id;
    flowikiService.send('VIEW_NODE');
  }

  function goBack() {
    flowikiService.send('BACK');
  }

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
    viewNode={viewNode}
  />
{:else}
  <Node entries={displayNodeEntries} goBack={goBack} />
{/if}
