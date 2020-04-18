let currentHashId = 1;
let currentNodeNameTextEntry = "some name";

let navigateToNodeAction = assign(ctxt => {
  let nodeId = currentHashId;
  let node = ctxt.nodes[nodeId];
  let entries = node.entries;
  return {
    currentNodeId: nodeId,
    nodeCursorId: entries.length - 1,
    nodeName: node.name,
  };
});

let saveNodeNameAction = assign(ctxt => {
  let copyNodes = {...ctxt.nodes};
  if (ctxt.currentNodeId !== null) {
    let i = ctxt.currentNodeId;
    copyNodes[i] = {...ctxt.nodes[i]};
    copyNodes[i].name = currentNodeNameTextEntry;

    // TODO: why set nodeName here?
    return {
      nodes: copyNodes,
      nodeName: currentNodeNameTextEntry,
    };
  } else {
    let existingIds = Object.keys(copyNodes).map(id => parseInt(id));
    let maxId = Math.max(...existingIds);

    let newId = maxId + 1

    let newNodeEntries = ['TODO'];

    // TODO: move node creation code to another event's action? the event should be a self loop on navigate that finally saves a new node
    // if this is a node creation, also save a new document?
    copyNodes[newId] = {
      id: newId,
      name: currentNodeNameTextEntry,
      entries: newNodeEntries,
    };

    console.log(" ++ new node = ", copyNodes[newId]);

    let newDisplayNodes = [...ctxt.displayNodes];
    newDisplayNodes.push(newId);

    // TODO: why set nodeName here?
    return {
      nodes: copyNodes,
      nodeName: currentNodeNameTextEntry,
      currentNodeId: newId,
      displayNodes: newDisplayNodes,
    };
  }

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
    nodeCursorId: 0,
  };
}


// TODO: figure out a way to trigger a transition only in the nodeName substate
// to the "nodeName.editing" subsubstate
let createNodeAction = assign(ctxt => {
  return {
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
  if (ctxt.currentNodeId !== null) {
    const numEntries = ctxt.nodes[ctxt.currentNodeId].entries.length;
    return {
      nodeCursorId: ctxt.nodeCursorId >= numEntries - 1 ? numEntries - 1 : ctxt.nodeCursorId + 1
    };
  }
  return {};
});

let createEntryBelowAction = assign(ctxt => {
  let nodeCursorId = ctxt.nodeCursorId;

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
          target: ['node.nodeName.editing', 'node.flowytree.navigating'],
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
