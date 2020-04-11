<script>
  import { Machine, interpret, assign } from 'xstate';
	export let name;

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
              //actions: initFromRandom
            },
            CREATE_NODE: {
              target: 'node',
              //actions: initFromText
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

  function goBack() {
    flowikiService.send('BACK');
  }

</script>

<style>
	h1 {
		color: purple;
	}
</style>

<h1>Hello {name}!</h1>

{#if isAtTop}
  <p>TOP</p>
  <button on:click={createNode}>create new node</button>
{:else}
  <p>node</p>
  <button on:click={goBack}>go back</button>
{/if}
