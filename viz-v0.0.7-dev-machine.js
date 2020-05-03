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
    nodeCursorId: 0,
  };
}


// TODO: figure out a way to trigger a transition only in the nodeName substate
// to the "nodeName.editing" subsubstate
let createNodeAction = assign(ctxt => {

  let copyNodes = {...ctxt.nodes};
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


  return {
    currentNodeId: newId,
    nodeCursorId: 0,
    nodeName: 'New document',
    nodes: copyNodes,
    displayNodes: newDisplayNodes,
  };
});

let goUpAction = assign(ctxt => {
  return {
    nodeCursorId: ctxt.nodeCursorId === 0 ? 0 : ctxt.nodeCursorId - 1
  };
});

let goDownAction = assign(ctxt => {
  const numEntries = ctxt.nodes[ctxt.currentNodeId].entries.length;
  return {
    nodeCursorId: ctxt.nodeCursorId >= numEntries - 1 ? numEntries - 1 : ctxt.nodeCursorId + 1
  };
});

let createEntryBelowAction = assign(ctxt => {
  let nodeCursorId = ctxt.nodeCursorId;

  // only update nodes if there's a nodeId
  let newNodes;
  newNodes = {...ctxt.nodes};
  let id = ctxt.currentNodeId
  newNodes[id].entries = [...newNodes[id].entries];
  newNodes[id].entries.splice(nodeCursorId+1, 0, 'TODO');

  console.log("about to create entry below, newNodes = ", newNodes);

  return {
    nodeCursorId: nodeCursorId + 1,
    nodes: newNodes,
  };
});


const nodeStates = {
  states: {
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
          target: ['node.nodeName.editing'],
          actions: createNodeAction,
        },
      },
    },
    node: {
      on: {
        UP: {
          actions: goUpAction
        },
        DOWN: {
          actions: goDownAction
        },
        CREATE_ENTRY_BELOW: {
          actions: createEntryBelowAction,
        }
      },
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
