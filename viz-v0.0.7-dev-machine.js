let currentHashId = 1;
let currentNodeNameTextEntry = "some name";

let navigateToNodeAction = assign(ctxt => {
  let nodeId = currentHashId;
  let node = ctxt.nodes[nodeId];
  let entries = node.entries;
  return {
    currentNodeId: nodeId,
    displayNodeEntries: entries,
    nodeCursorId: entries.length - 1,
    nodeName: node.name,
  };
});

let saveNodeNameAction = assign(ctxt => {
  let copyNodes = {...ctxt.nodes};
  let i = ctxt.currentNodeId;
  copyNodes[i] = {...ctxt.nodes[i]};
  copyNodes[i].name = currentNodeNameTextEntry;

  return {
    nodes: copyNodes,
    nodeName: currentNodeNameTextEntry,
  };
});



function generateTestContext() {
  return {
    currentNodeId: null,
    nodeName: '',
    nodes: {
      '1': {
        id: 1,
        name: 'some letters',
        entries: ['a', 'b', 'c'],
      },
      '2': {
        id: 2,
        name: 'some numbers',
        entries: ['4', '5' ],
      },
      '4': {
        id: 4,
        name: 'some greek letters',
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
  let newNodeEntries = ctxt.displayNodeEntries.splice(nodeCursorId+1, 0, 'TODO');
  return {
    nodeCursorId: nodeCursorId + 1,
    displayNewEntries: newNodeEntries,
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
          }
        },
        displaying: {
          on: {
            START_EDITING_NAME: {
              target: 'editing',
            }
          },
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

const flowikiMachine = Machine({
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
