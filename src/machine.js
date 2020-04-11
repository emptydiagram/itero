import { Machine, assign } from 'xstate';

function generateTestContext() {
  return {
    currentNodeId: null,
    nodes: {
      '1': {
        id: 1,
        name: 'foo',
        entries: ['a', 'b', 'c'],
      },
      '2': {
        id: 2,
        name: 'bar',
        entries: ['4', '5' ],
      },
      '4': {
        id: 4,
        name: 'baz',
        entries: ['alpha', 'beta', 'gamma', 'delta']
      }
    },
    displayNodes: [1, 2, 4],
    displayNodeEntries: [],
  };
}

const nodeStates = {
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

let createNodeAction = assign(ctxt => {
  return {
    displayNodeEntries: [],
  };
});

export default (navigateToNodeAction) => {
  const flowikiStates = {
    initial: 'top',
    states: {
      top: {
        on: {
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
        ...nodeStates
      }
    }
  };

  return Machine({
    id: 'flowiki',
    initial: 'flowiki',
    context: generateTestContext(),
    states: {
      flowiki: {
        on: {
          NAVIGATE: {
            target: 'flowiki.node',
            actions: navigateToNodeAction,
          },
          GO_HOME: {
            target: 'flowiki.top',
          }
        },
        ...flowikiStates
      }
    }

  });
};
