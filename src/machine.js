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
    nodeIsEditingName: false,
  };
}


let createNodeAction = assign(ctxt => {
  return {
    displayNodeEntries: ['TODO'],
    currentNodeId: null,
    nodeName: '',
    nodeIsEditingName: true,
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

let saveNameAction = assign(ctxt => {
  return {
    nodeIsEditingName: false,
  };
});

let startEditingNameAction = assign(ctxt => {
  return {
    nodeIsEditingName: true,
  };
});

let cancelEditingNameAction = assign(ctxt => {
  return {
    nodeIsEditingName: false,
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
        SAVE_NAME: {
          target: 'nodeName.displaying',
          actions: saveNameAction,
        },
        START_EDITING_NAME: {
          target: 'nodeName.editing',
          actions: startEditingNameAction,
        },
        CANCEL_EDITING_NAME: {
          target: 'nodeName.displaying',
          actions: cancelEditingNameAction,
        }
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


export default (navigateToNodeAction) => {
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
