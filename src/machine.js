import { Machine, assign } from 'xstate';


const flowikiStates = {
  initial: 'navigating',
  states: {
    navigating: {
      on: {
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

export default (viewNodeAction) => {
  let createNodeAction = assign(ctxt => {
    return {
      displayNodeEntries: [],
    };
  });

  return Machine({
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
};
