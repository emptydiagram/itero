import { Machine, assign } from 'xstate';

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
    nodeCursorRowId: 0,
    nodeCursorColId: 0,
  };
}


let createNodeAction = assign(ctxt => {
  let copyNodes = {...ctxt.nodes};
  let existingIds = Object.keys(copyNodes).map(id => parseInt(id));
  let maxId = Math.max(...existingIds);
  let newId = maxId + 1
  let newNodeEntries = ['TODO'];
  let newNodeName = 'New document'

  // TODO: move node creation code to another event's action? the event should be a self loop on navigate that finally saves a new node
  // if this is a node creation, also save a new document?
  copyNodes[newId] = {
    id: newId,
    name: newNodeName,
    entries: newNodeEntries,
  };

  console.log(" ++ new node = ", copyNodes[newId]);

  let newDisplayNodes = [...ctxt.displayNodes];
  newDisplayNodes.push(newId);


  return {
    currentNodeId: newId,
    nodeCursorRowId: 0,
    nodeName: 'New document',
    nodes: copyNodes,
    displayNodes: newDisplayNodes,
  };
});


let goUpAction = assign(ctxt => {
  return {
    nodeCursorRowId: ctxt.nodeCursorRowId === 0 ? 0 : ctxt.nodeCursorRowId - 1
  };
});

let goDownAction = assign(ctxt => {
  const numEntries = ctxt.nodes[ctxt.currentNodeId].entries.length;
  return {
    nodeCursorRowId: ctxt.nodeCursorRowId >= numEntries - 1 ? numEntries - 1 : ctxt.nodeCursorRowId + 1
  };
});

let createEntryBelowAction = assign(ctxt => {
  let nodeCursorRowId = ctxt.nodeCursorRowId;

  // only update nodes if there's a nodeId
  let newNodes;
  newNodes = {...ctxt.nodes};
  let id = ctxt.currentNodeId
  newNodes[id].entries = [...newNodes[id].entries];
  newNodes[id].entries.splice(nodeCursorRowId+1, 0, 'TODO');

  console.log("about to create entry below, newNodes = ", newNodes);

  return {
    nodeCursorRowId: nodeCursorRowId + 1,
    nodes: newNodes,
  };
});


export default (navigateToNodeAction, saveNodeNameAction, saveNodeEntryAction) => {

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
          },
          SAVE_NODE_ENTRY: {
            actions: saveNodeEntryAction,
          }
        },
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
