let currentHashId = 1;
let currentNodeNameTextEntry = "some name";

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


// TODO: figure out a way to trigger a transition only in the nodeName substate
// to the "nodeName.editing" subsubstate
let createNodeAction = assign(ctxt => {
  return {
    displayNodeEntries: ['TODO'],
    currentNodeId: null,
    nodeName: '',
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
      on: {
        SAVE_NODE_NAME: {
          target: 'nodeName.displaying',
          actions: saveNodeNameAction,
        },
        START_EDITING_NAME: {
          target: 'nodeName.editing',
        },
        CANCEL_EDITING_NAME: {
          target: 'nodeName.displaying',
        },
      },
      initial: 'displaying',
      states: {
        editing: {
        },
        displaying: {
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
        CREATE_NODE: {
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
