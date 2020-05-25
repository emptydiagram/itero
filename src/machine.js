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

  parentId = parentId === 0 ? parentId : (parentId || null);
  return new FlowyTreeNode(currId, parentId, nodesList);
}

function makeTree(entries, treeObj) {
  let theRoot = treeObjToNode(treeObj, null);
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
    nodeCursorEntryId: null,
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
    nodeCursorEntryId: null,
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
  let hasEntryAbove = currTree.hasEntryAbove(ctxt.nodeCursorEntryId);


  let newEntryId = hasEntryAbove ? currTree.getEntryIdAbove(ctxt.nodeCursorEntryId) : ctxt.nodeCursorEntryId;
  return {
    nodeCursorEntryId: newEntryId,
  };
});

let goDownAction = assign(ctxt => {
  // TODO
  let currTree = ctxt.nodes[ctxt.currentNodeId].doc;
  let hasEntryBelow = currTree.hasEntryBelow(ctxt.nodeCursorEntryId);

  let newEntryId = hasEntryBelow ? currTree.getEntryIdBelow(ctxt.nodeCursorEntryId) : ctxt.nodeCursorEntryId;
  return {
    nodeCursorEntryId: newEntryId,
  };
});

let splitEntryAction = assign(ctxt => {
  let nodeId = ctxt.currentNodeId;
  let entryId = ctxt.nodeCursorEntryId;
  let colId = ctxt.nodeCursorColId;

  // TODO: only update nodes if there's a nodeId (is this possible?)
  let newNodes = { ...ctxt.nodes };
  let currNode = newNodes[nodeId];
  let currTree = currNode.doc;
  let currEntry = currTree.getEntry(entryId);

  console.log(" Splitting '" + currEntry + "' at colId = ", colId);
  let updatedCurrEntry = currEntry.substring(0, colId);
  let newEntry = currEntry.substring(colId, currEntry.length);

  let newTree = new FlowyTree(currTree.getEntries(), currTree.getRoot());
  currNode.doc = newTree;

  newTree.setEntry(entryId, updatedCurrEntry);
  let parentId = currTree.getParentId(entryId);
  let newId = newTree.insertEntryBelow(entryId, parentId, newEntry);

  return {
    nodeCursorEntryId: newId,
    nodeCursorColId: 0,
    nodes: newNodes,
  };
});

let indentAction = assign(ctxt => {
  let entryId = ctxt.nodeCursorEntryId;
  let nodeId = ctxt.currentNodeId;

  //  1. check if LinkedListItem can be indented
  //  2. if so, get LinkedListItem for entryId in nodeId, and make it a child of its previous sibling
  let newNodes = { ...ctxt.nodes };
  let currTree = newNodes[nodeId].doc;

  let currItem = currTree.getEntryItem(entryId);
  if (currTree.hasPrevSibling(entryId)) {
    let prevNode = currTree.getPrevSiblingNode(entryId);
    currItem.detach();
    prevNode.appendChildItem(currItem);
    let parentId = prevNode.getId();
    currItem.value.setParentId(parentId);
  }
});

let dedentAction = assign(ctxt => {
  let entryId = ctxt.nodeCursorEntryId;
  let nodeId = ctxt.currentNodeId;

  //  1. check if LinkedListItem can be dedented
  //  2. if so, get LinkedListItem for entryId in nodeId, and make it the next sibling of parent
  let newNodes = { ...ctxt.nodes };
  let currTree = newNodes[nodeId].doc;

  let currItem = currTree.getEntryItem(entryId);
  if (currItem.value.hasParent()) {
    let parentItem = currTree.getEntryItem(currItem.value.getParentId());
    currItem.detach();
    parentItem.append(currItem);
    let parentParentId = parentItem.value.getParentId();
    currItem.value.setParentId(parentParentId);
  }
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
          INDENT: {
            actions: indentAction,
          },
          DEDENT: {
            actions: dedentAction,
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
