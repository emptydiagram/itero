import { Machine, assign } from 'xstate';
import FlowyTree from './FlowyTree.js';
import { treeObjToNode } from './serialization.js';

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
    currentDocId: null,
    docTitle: '',
    documents: {
      '1': {
        id: 1,
        name: 'some letters',
        tree: makeTree(...entries[0]),
      },
      '2': {
        id: 2,
        name: 'some numbers',
        tree: makeTree(...entries[1]),
      },
      '4': {
        id: 4,
        name: 'some greek letters',
        tree: makeTree(...entries[2]),
      }
    },
    displayDocs: [1, 2, 4],
    docCursorEntryId: null,
    docCursorColId: 0,
  };
}


let createDocAction = assign(ctxt => {
  let copyDocs = { ...ctxt.documents };
  let existingIds = Object.keys(copyDocs).map(id => parseInt(id));
  let maxId = Math.max(...existingIds);
  let newId = maxId + 1
  let initEntryText = 'TODO';
  let newTree = makeTree({ 0: initEntryText }, { root: [0] });
  let newDocName = 'New document'

  copyDocs[newId] = {
    id: newId,
    name: newDocName,
    tree: newTree,
  };

  let newDisplayDocs = [...ctxt.displayDocs];
  newDisplayDocs.push(newId);

  return {
    currentDocId: newId,
    docCursorEntryId: null,
    docCursorColId: 0,
    docTitle: 'New document',
    documents: copyDocs,
    displayDocs: newDisplayDocs,
  };
});


let goUpAction = assign(ctxt => {
  // TODO: use currentDocId to get current flowy tree. use current tree to
  //   a) check if current entry can go up (is the top-most entry in the document)
  //   b) if not, get the entry id of the entry immediately above
  let currTree = ctxt.documents[ctxt.currentDocId].tree;
  let hasEntryAbove = currTree.hasEntryAbove(ctxt.docCursorEntryId);


  let newEntryId = hasEntryAbove ? currTree.getEntryIdAbove(ctxt.docCursorEntryId) : ctxt.docCursorEntryId;
  return {
    docCursorEntryId: newEntryId,
  };
});

let goDownAction = assign(ctxt => {
  // TODO
  let currTree = ctxt.documents[ctxt.currentDocId].tree;
  let hasEntryBelow = currTree.hasEntryBelow(ctxt.docCursorEntryId);

  let newEntryId = hasEntryBelow ? currTree.getEntryIdBelow(ctxt.docCursorEntryId) : ctxt.docCursorEntryId;
  return {
    docCursorEntryId: newEntryId,
  };
});

let splitEntryAction = assign(ctxt => {
  let docId = ctxt.currentDocId;
  let entryId = ctxt.docCursorEntryId;
  let colId = ctxt.docCursorColId;

  // TODO: only update documents if there's a docId (is this possible?)
  let newDocs = { ...ctxt.documents };
  let currDoc = newDocs[docId];
  let currTree = currDoc.tree;
  let currEntry = currTree.getEntry(entryId);

  console.log(" Splitting '" + currEntry + "' at colId = ", colId);
  let newEntry = currEntry.substring(0, colId);
  let updatedCurrEntry = currEntry.substring(colId, currEntry.length);

  let newTree = new FlowyTree(currTree.getEntries(), currTree.getRoot());
  currDoc.tree = newTree;

  newTree.setEntry(entryId, updatedCurrEntry);
  let parentId = currTree.getParentId(entryId);
  newTree.insertEntryAbove(entryId, parentId, newEntry);

  return {
    docCursorColId: 0,
    documents: newDocs,
  };
});

let indentAction = assign(ctxt => {
  let entryId = ctxt.docCursorEntryId;
  let docId = ctxt.currentDocId;

  //  1. check if LinkedListItem can be indented
  //  2. if so, get LinkedListItem for entryId in docId, and make it a child of its previous sibling
  let newDocs = { ...ctxt.documents };
  let currTree = newDocs[docId].tree;

  let currItem = currTree.getEntryItem(entryId);
  if (currTree.hasPrevSibling(entryId)) {
    let prevNode = currTree.getPrevSiblingNode(entryId);
    currItem.detach();
    prevNode.appendChildItem(currItem);
    let parentId = prevNode.getId();
    currItem.value.setParentId(parentId);
  }

  return {
    documents: newDocs
  }
});

let dedentAction = assign(ctxt => {
  let entryId = ctxt.docCursorEntryId;
  let docId = ctxt.currentDocId;

  //  1. check if LinkedListItem can be dedented
  //  2. if so, get LinkedListItem for entryId in docId, and make it the next sibling of parent
  let newDocs = { ...ctxt.documents };
  let currTree = newDocs[docId].tree;

  let currItem = currTree.getEntryItem(entryId);
  if (currItem.value.hasParent()) {
    let parentItem = currTree.getEntryItem(currItem.value.getParentId());
    currItem.detach();
    parentItem.append(currItem);
    let parentParentId = parentItem.value.getParentId();
    currItem.value.setParentId(parentParentId);
  }

  return {
    documents: newDocs
  }
});


export default (navigateToDocAction, saveDocNameAction, saveDocEntryAction, saveFullCursorAction, saveCursorColIdAction, backspaceAction) => {

  const docStates = {
    states: {
      docTitle: {
        on: {},
        initial: 'displaying',
        states: {
          editing: {
            on: {
              SAVE_DOC_NAME: {
                target: 'displaying',
                actions: saveDocNameAction,
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
          CREATE_DOC: {
            target: ['document.docTitle.editing'],
            actions: createDocAction,
          },
        },
      },
      document: {
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
          SAVE_DOC_ENTRY: {
            actions: saveDocEntryAction,
          },
          SAVE_FULL_CURSOR: {
            actions: saveFullCursorAction,
          },
          SAVE_CURSOR_COL_ID: {
            actions: saveCursorColIdAction,
          }
        },
        type: 'parallel',
        ...docStates
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
            target: 'flowiki.document',
            actions: navigateToDocAction,
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
