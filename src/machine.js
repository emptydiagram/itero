import { Machine, assign } from 'xstate';

function generateTestContext() {
  return {
    currentNodeId: null,
    nodeName: '',
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
    nodeCursorId: 0,
  };
}


// TODO: figure out a way to trigger a transition only in the nodeName substate
// to the "nodeName.editing" subsubstate
let createNodeAction = assign(ctxt => {
  return {
    displayNodeEntries: ['TODO'],
    currentNodeId: null,
    nodeCursorId: 0,
    nodeName: 'New document',
  };
});

let goUpAction = assign(ctxt => {
  return {
    nodeCursorId: ctxt.nodeCursorId === 0 ? 0 : ctxt.nodeCursorId - 1
  };
});

let goDownAction = assign(ctxt => {
  return {
    nodeCursorId: ctxt.nodeCursorId >= ctxt.displayNodeEntries.length - 1 ? ctxt.nodeCursorId : ctxt.nodeCursorId + 1
  };
});

let createEntryBelowAction = assign(ctxt => {
  let nodeCursorId = ctxt.nodeCursorId;
  let newNodeEntries = [...ctxt.displayNodeEntries];
  newNodeEntries.splice(nodeCursorId+1, 0, 'TODO');

  // only update nodes if there's a nodeId
  let newNodes;
  if (ctxt.currentNodeId !== null) {
    newNodes = {...ctxt.nodes};
    let id = ctxt.currentNodeId
    newNodes[id].entries = [...newNodes[id].entries];
    newNodes[id].entries.splice(nodeCursorId+1, 0, 'TODO');
  } else {
    newNodes = ctxt.nodes;
  }

  console.log("about to create entry below, newNodes = ", newNodes);

  return {
    nodeCursorId: nodeCursorId + 1,
    displayNodeEntries: newNodeEntries,
    nodes: newNodes,
  };
});

const flowytreeStates = {
  initial: 'navigating',
  states: {
    navigating: {
      on: {
        UP: {
          actions: goUpAction
        },
        DOWN: {
          actions: goDownAction
        },
        START_EDIT: {
          target: 'editing'
        },
        CREATE_ENTRY_BELOW: {
          actions: createEntryBelowAction,
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
};


export default (navigateToNodeAction, saveNodeNameAction) => {

  const nodeStates = {
    states: {
      flowytree: {
        ...flowytreeStates
      },
      nodeName: {
        on: {},
        initial: 'displaying',
        states: {
          editing: {
            on: {
              SAVE_NODE_NAME: {
                target: 'displaying',
                actions: saveNodeNameAction,
              },
              CANCEL_EDITING_NAME: {
                target: 'displaying',
              },
            },
          },
          displaying: {
            on: {
              START_EDITING_NAME: {
                target: 'editing',
              },
            }
          }
        }
      }
    },
  }

  const flowikiStates = {
    initial: 'top',
    states: {
      top: {
        on: {
          INIT_CREATE_NODE: {
            target: 'node',
            actions: createNodeAction,
          },
        },
      },
      node: {
        type: 'parallel',
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
