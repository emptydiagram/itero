import { Machine, assign } from 'xstate';
import FlowyTree from './FlowyTree.js';
import FlowyTreeNode from './FlowyTreeNode.js';
import { EntryDisplayState } from "./data.js";

let createDocAction = assign(ctxt => {
  let copyDocs = { ...ctxt.documents };
  let existingIds = Object.keys(copyDocs).map(id => parseInt(id));
  let maxId = Math.max(...existingIds);
  let newId = maxId + 1
  let initEntryText = 'TODO';

  let newTree = new FlowyTree({ 0: {text: initEntryText} }, FlowyTreeNode.fromTreeObj({ root: [0] }, null))
  let newDocName = 'New document'

  copyDocs[newId] = {
    id: newId,
    name: newDocName,
    tree: newTree,
  };

  let newDisplayDocs = [...ctxt.displayDocs];
  newDisplayDocs.push(newId);

  // add entry into docIdLookup
  let newLookup = { ...ctxt.docIdLookupByDocName };
  newLookup[newDocName] = newId;

  return {
    currentDocId: newId,
    docCursorEntryId: null,
    docCursorColId: 0,
    docTitle: 'New document',
    documents: copyDocs,
    displayDocs: newDisplayDocs,
    docIdLookupByDocName: newLookup
  };
});


let goUpAction = assign(ctxt => {
  // use currentDocId to get current flowy tree. use current tree to
  //   a) check if current entry can go up (is the top-most entry in the document)
  //   b) if not, get the entry id of the entry immediately above
  let currTree = ctxt.documents[ctxt.currentDocId].tree;
  let hasEntryAbove = currTree.hasEntryAbove(ctxt.docCursorEntryId);


  let newEntryId = hasEntryAbove ? currTree.getEntryIdAboveWithCollapse(ctxt.docCursorEntryId) : ctxt.docCursorEntryId;
  return {
    docCursorEntryId: newEntryId,
  };
});

let goDownAction = assign(ctxt => {
  let currTree = ctxt.documents[ctxt.currentDocId].tree;
  // TODO: take into account collapse
  let hasEntryBelow = currTree.hasEntryBelow(ctxt.docCursorEntryId);

  let newEntryId = hasEntryBelow ? currTree.getEntryIdBelowWithCollapse(ctxt.docCursorEntryId) : ctxt.docCursorEntryId;
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
  let currEntryText = currTree.getEntryText(entryId);
  let parentId = currTree.getParentId(entryId);

  let newTree = new FlowyTree(currTree.getEntries(), currTree.getRoot());
  currDoc.tree = newTree;

  // if at the end of a collapsed item, make a next sibling with empty text
  if (currTree.getEntryDisplayState(entryId) === EntryDisplayState.COLLAPSED
      && colId === currEntryText.length) {

    let newId = newTree.insertEntryBelow(entryId, parentId, '');

    return {
      docCursorEntryId: newId,
      docCursorColId: 0,
      documents: newDocs,
    }
  }

  let newEntryText = currEntryText.substring(0, colId);
  let updatedCurrEntry = currEntryText.substring(colId, currEntryText.length);

  newTree.setEntryText(entryId, updatedCurrEntry);
  newTree.insertEntryAbove(entryId, parentId, newEntryText);

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


export default (initContext, navigateToDocAction, importDocsAction, saveDocNameAction,
    saveDocEntryAction, saveFullCursorAction, saveCursorColIdAction, backspaceAction,
    collapseEntryAction, expandEntryAction, savePastedEntriesAction) => {

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
          COLLAPSE_ENTRY: {
            actions: collapseEntryAction,
          },
          EXPAND_ENTRY: {
            actions: expandEntryAction,
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
          SAVE_PASTED_ENTRIES: {
            actions: savePastedEntriesAction,
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
    context: initContext,
    states: {
      flowiki: {
        on: {
          NAVIGATE: {
            target: 'flowiki.document',
            actions: navigateToDocAction,
          },
          GO_HOME: {
            target: 'flowiki.top',
          },
          IMPORT_DOCS: {
            target: 'flowiki.top',
            actions: importDocsAction,
          }
        },
        ...flowikiStates
      }
    }

  });
};
