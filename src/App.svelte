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
        nodes: {},
        displayNodes: [],
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
</script>

<style>
	h1 {
		color: purple;
	}
</style>

<h1>Hello {name}!</h1>
