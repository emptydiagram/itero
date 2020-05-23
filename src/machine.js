import { Machine, assign } from 'xstate';
import FlowyTree from './FlowyTree.js';
import FlowyTreeNode from './FlowyTreeNode.js';
import { LinkedListItem, LinkedList } from './LinkedList.js';

function isObject(obj) {
  return obj === Object(obj);
}

// impl full handling of treeObj
//
// returns: a FlowyTreeNode which corresponds to the specification in treeObj
function treeObjToNode(treeObj, parentId) {
  let rootKey = Object.keys(treeObj)[0];
  let currNode = treeObj[rootKey];
  let currId = rootKey === "root" ? null : parseInt(rootKey);
  let nodesArray = Array.from(
    currNode,
    child => new LinkedListItem(
      isObject(child)
        ? treeObjToNode(child, currId)
        : new FlowyTreeNode(child, currId)));
  // a linked list of (LinkedListItems of) FlowyTreeNodes, one for each child in treeObj
  let nodesList = new LinkedList(...nodesArray);

  return new FlowyTreeNode(currId, parentId || null, nodesList);
}

function makeTree(entries, treeObj) {
  let theRoot = treeObjToNode(treeObj);
  return new FlowyTree(entries, theRoot);
}

function generateTestContext() {
  let entries = [
    [
      { 0: 'abc', 1: 'def', 2: 'ghi', 3: 'eEe EeE', 4: 'Ww Xx Yy Zz' },
      { root: [{ 0: [1, 2] }, 3, 4] }
    ],
    [
      { 0: '4', 1: 'five', 2: 'seventy', 3: '-1' },
      { root: [2, 0, 3, 1] }
    ],
    [
      { 0: 'alpha', 1: 'beta', 2: 'gamma', 3: 'delta' },
      {
        root: [
          {
            0: [
              { 1: [2, 3] }
            ]
          }
        ]
      }
    ],
  ];
  return {
    currentNodeId: null,
    nodeTitle: '',
    nodes: {
      '1': {
        id: 1,
        name: 'some letters',
        doc: makeTree(...entries[0]),
      },
      '2': {
        id: 2,
        name: 'some numbers',
        doc: makeTree(...entries[1]),
      },
      '4': {
        id: 4,
        name: 'some greek letters',
        doc: makeTree(...entries[2]),
      }
    },
    displayNodes: [1, 2, 4],
    nodeCursorRowId: 0,
    nodeCursorColId: 0,
  };
}


let createNodeAction = assign(ctxt => {
  let copyNodes = { ...ctxt.nodes };
  let existingIds = Object.keys(copyNodes).map(id => parseInt(id));
  let maxId = Math.max(...existingIds);
  let newId = maxId + 1
  let initEntryText = 'TODO';
  let newTree = makeTree({ 0: initEntryText }, { root: [0] });
  let newNodeName = 'New document'

  copyNodes[newId] = {
    id: newId,
    name: newNodeName,
    doc: newTree,
  };

  let newDisplayNodes = [...ctxt.displayNodes];
  newDisplayNodes.push(newId);


  return {
    currentNodeId: newId,
    nodeCursorRowId: 0,
    nodeCursorColId: 0,
    nodeTitle: 'New document',
    nodes: copyNodes,
    displayNodes: newDisplayNodes,
  };
});


let goUpAction = assign(ctxt => {
  // TODO: use currentNodeId to get current flowy tree. use current tree to
  //   a) check if current entry can go up (is the top-most entry in the document)
  //   b) if not, get the entry id of the entry immediately above
  let currTree = ctxt.nodes[ctxt.currentNodeId].doc;


  let newRowId = ctxt.nodeCursorRowId === 0 ? 0 : ctxt.nodeCursorRowId - 1;
  return {
    nodeCursorRowId: newRowId,
  };
});

let goDownAction = assign(ctxt => {
  // TODO
  const numEntries = ctxt.nodes[ctxt.currentNodeId].doc.size();
  let newRowId = ctxt.nodeCursorRowId >= numEntries - 1 ? numEntries - 1 : ctxt.nodeCursorRowId + 1;
  return {
    nodeCursorRowId: newRowId,
  };
});

let splitEntryAction = assign(ctxt => {
  let rowId = ctxt.nodeCursorRowId;

  // only update nodes if there's a nodeId
  let newNodes;
  newNodes = { ...ctxt.nodes };
  let nodeId = ctxt.currentNodeId;
  let currNode = newNodes[nodeId];
  let currEntry = currNode.doc.getEntryByRow(rowId);

  let colId = ctxt.nodeCursorColId;
  console.log(" Splitting '" + currEntry + "' at colId = ", colId);
  let updatedCurrEntry = currEntry.substring(0, colId);
  let newEntry = currEntry.substring(colId, currEntry.length);

  let newTree = new FlowyTree(currNode.doc.getEntries(), currNode.doc.getRoot());
  currNode.doc = newTree;

  newTree.setEntry(rowId, updatedCurrEntry);
  newTree.insertAt(rowId + 1, newEntry);

  return {
    nodeCursorRowId: rowId + 1,
    nodeCursorColId: 0,
    nodes: newNodes,
  };
});




export default (navigateToNodeAction, saveNodeNameAction, saveNodeEntryAction, saveFullCursorAction, saveCursorColIdAction, backspaceAction) => {

  const nodeStates = {
    states: {
      nodeTitle: {
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
            target: ['node.nodeTitle.editing'],
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
          SPLIT_ENTRY: {
            actions: splitEntryAction,
          },
          ENTRY_BACKSPACE: {
            actions: backspaceAction,
          },
          SAVE_NODE_ENTRY: {
            actions: saveNodeEntryAction,
          },
          SAVE_FULL_CURSOR: {
            actions: saveFullCursorAction,
          },
          SAVE_CURSOR_COL_ID: {
            actions: saveCursorColIdAction,
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
