<script>
  import { Machine, interpret, assign } from 'xstate';

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

  let createNodeAction = assign(ctxt => {
    return {
      displayNodeEntries: [],
    };
  });

  const flowikiStates = {
    initial: 'navigating',
    states: {
      navigating: {
        on: {
          /*
          UP: {
            actions: assign(ctxt => {
              console.log('TODO, UP. context = ', ctxt);
              return {
                value: newValue,
                history: [...ctxt.history, newValue],
              };
            })
          },
           */
          START_EDIT: {
            target: 'editing'
          }
        }
      },

      editing: {
        on: {
          SAVE: {
            target: 'navigating',
          }
        }
      }
    }
  }

  const flowikiMachine = Machine(
    {
      id: 'flowiki',
      initial: 'top',
      context: {
        currentNodeId: null,
        nodes: {
          '1': {
            name: 'foo',
            entries: ['a', 'b', 'c'],
          },
          '2': {
            name: 'bar',
            entries: ['4', '5' ],
          },
          '3': {
            name: 'baz',
            entries: ['alpha', 'beta', 'gamma', 'delta']
          }
        },
        displayNodes: [1, 2, 3],
        displayNodeEntries: [],
      },
      states: {
        top: {
          on: {
            VIEW_NODE: {
              target: 'node',
              actions: viewNodeAction,
            },
            CREATE_NODE: {
              target: 'node',
              actions: createNodeAction,
            },
          },
        },
        node: {
          on: {
            BACK: {
              target: 'top',
            }
          },
          ...flowikiStates
        }
      }
    });

  const flowikiService = interpret(flowikiMachine);

  let machineState = flowikiMachine.initialState;
  flowikiService.onTransition(state => {
    console.log("transitioning to context = ", state.context, ", state = ", state.value);
    machineState = state;
  });

  flowikiService.start();


  console.log("+++machineState = ", machineState);
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
    console.log("making displayNodes, nodes = ", machineState.context.nodes);
    return machineState.context.nodes[id].name;
  });

  $: displayNodeEntries = machineState.context.displayNodeEntries;

</script>

<style>
  h1 {
  }
</style>

<h1>treacle</h1>

{#if isAtTop}
  <p>TOP</p>
  <button on:click={createNode}>create new node</button>

  <ul>
  {#each displayNodes as node, i}
    <li>{node}</li>
    <button on:click={() => viewNode(i+1)}>view node {i}</button>
  {/each}
  </ul>

{:else}
  <p>node</p>

  <ul>
  {#each displayNodeEntries as nodeEntry}
    <li>{nodeEntry}</li>
  {/each}
  </ul>


  <button on:click={goBack}>go back</button>
{/if}
