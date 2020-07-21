import { EntryDisplayState, createNewDocument, getNowISO8601 } from "../data.js";
import FlowyTree from '../FlowyTree.js';

import { writable } from 'svelte/store';

// given: sets a, b
// returns: [elements removed from a, elements added to a]
function diffSets(a, b) {
  let removed = [];
  let added = [];
  for (let [entry, _] of a.entries()) {
    if (!b.has(entry)) {
      removed.push(entry);
    }
  }
  for (let [entry, _] of b.entries()) {
    if (!a.has(entry)) {
      added.push(entry);
    }
  }
  return [removed, added];
}


function createDocsStore() {
  let { subscribe, update } = writable({
    currentDocId: null,
    cursorSelectionStart: 0,
    cursorSelectionEnd: 0,
    cursorEntryId: null,
    docName: '',
    docIsEditingName: false,
    docsDisplay: {},
    docIdLookupByDocName: {},
    documents: {},
  });

  function createDocsDisplayEntry(newId) {
    return { docId: newId, isSelected: false };
  }

  return {
    subscribe,
    init: (documents, docIdLookupByDocName, linkGraph) => update(store => {
      let initDocsDisplay = {};
      Object.keys(documents).forEach(docId => {
        initDocsDisplay[docId] = createDocsDisplayEntry(docId)
      });
      store.docsDisplay = initDocsDisplay
      store.docIdLookupByDocName = docIdLookupByDocName;
      store.documents = documents;
      store.linkGraph = linkGraph;
      return store;
    }),

    createNewDocument: () => update(store => {
      let newDocName = 'New document'
      let newDoc = createNewDocument(newDocName, 'TODO', store.documents);
      let newId = newDoc.id;
      // append the new doc id for uniqueness(-ish)
      newDoc.name += ` ${newId}`;
      store.documents[newId] = newDoc;

      // add entry into docIdLookup
      store.docIdLookupByDocName[newDocName] = newId;

      store.currentDocId = newId;
      store.docName = newDocName;
      // TODO: how can this be null?
      store.cursorSelectionStart = null;
      store.cursorSelectionEnd = null;
      store.cursorEntryId = 0;
      store.docsDisplay[newId] = createDocsDisplayEntry(newId);
      return store;
    }),

    docsDisplaySetSelection: (docId, newSelectionValue) => update(store => {
      store.docsDisplay[docId].isSelected = newSelectionValue;
      return store;
    }),

    deleteDocs: (docIdList) => update(store => {
      docIdList.forEach(docId => {
        delete store.documents[docId];
        delete store.docsDisplay[docId];
        store.linkGraph.removeDoc(docId);
      });
      return store;
    }),


    navigateToDoc: (docId) => update(store => {
      let doc = store.documents[docId];
      // let initEntryId = doc.tree.getTopEntryId();
      store.currentDocId = docId;
      store.docName = doc.name;
      // store.cursorEntryId = initEntryId;
      store.cursorEntryId = null;
      return store;
    }),

    cancelEditingDocName: () => update(store => {
      // sync page's doc name display
      store.docIsEditingName = false;
      return store;
    }),
    startEditingDocName: () => update(store => {
      // sync page's doc name display
      store.docIsEditingName = true;
      return store;
    }),
    saveEditingDocName: (newDocName) => update(store => {
      // sync page's doc name display
      store.docName = newDocName;
      store.docIsEditingName = false;

      let docId = store.currentDocId;
      let currDoc = store.documents[docId];
      let oldDocName = currDoc.name;
      currDoc.name = newDocName;
      currDoc.lastUpdated = getNowISO8601();

      // remove old entry, add new in docIdLookup
      delete store.docIdLookupByDocName[oldDocName];
      store.docIdLookupByDocName[newDocName] = docId;

      // scan in-adjacency list. for each node, update all the internal links
      // NOTE: dont update lastUpdated for the in-neighbors.
      let inAdj = store.linkGraph.inAdjacency[docId];
      if (inAdj) {
        inAdj.forEach(backLinkEntry => {
          const [backLinkDocId, backLinkEntryId] = backLinkEntry.split('-');
          const currText = store.documents[backLinkDocId].tree.getEntryText(backLinkEntryId);
          store.documents[backLinkDocId].tree.setEntryText(
            backLinkEntryId, currText.replace(`[[${oldDocName}]]`, `[[${newDocName}]]`));
        });
      }
      return store;
    }),
    saveCurrentPageDocEntry: (newDocEntryText, newCursorSelStart, newCursorSelEnd) => update(store => {
      let i = store.currentDocId;
      let currDoc = store.documents[i];
      currDoc.tree.setEntryText(store.cursorEntryId, newDocEntryText);
      currDoc.lastUpdated = getNowISO8601();
      store.cursorSelectionStart = newCursorSelStart;
      store.cursorSelectionEnd = newCursorSelEnd;
      return store;
    }),
    saveCursor: (newEntryId, newCursorSelStart, newCursorSelEnd) => update(store => {
      store.cursorSelectionStart = newCursorSelStart;
      store.cursorSelectionEnd = newCursorSelEnd;
      store.cursorEntryId = newEntryId;
      return store;
    }),
    moveCursorLeft: () => update(store => {
      if (store.cursorSelectionStart === store.cursorSelectionEnd) {
        store.cursorSelectionStart = Math.max(0, store.cursorSelectionStart - 1);
        store.cursorSelectionEnd = store.cursorSelectionStart;
      } else {
        store.cursorSelectionEnd = store.cursorSelectionStart;
      }
      return store;
    }),
    moveCursorRight: (entryValueSize) => update(store => {
      if (store.cursorSelectionStart === store.cursorSelectionEnd) {
        store.cursorSelectionStart = Math.min(entryValueSize, store.cursorSelectionStart + 1);
        store.cursorSelectionEnd = store.cursorSelectionStart;
      } else {
        store.cursorSelectionStart = store.cursorSelectionEnd;
      }
      return store;
    }),
    saveCursorPosition: (pos) => update(store => {
      store.cursorSelectionStart = pos;
      store.cursorSelectionEnd = pos;
      return store;
    }),
    saveCursorEntryId: (newEntryId) => update(store => {
      store.cursorEntryId = newEntryId;
      return store;
    }),

    entryGoUp: () => update(store => {
      let currDocId = store.currentDocId;
      let cursorEntryId = store.cursorEntryId;
      let currTree = store.documents[currDocId].tree;
      let hasEntryAbove = currTree.hasEntryAbove(cursorEntryId);
      let newEntryId = hasEntryAbove ? currTree.getEntryIdAboveWithCollapse(cursorEntryId) : cursorEntryId;
      store.cursorEntryId = newEntryId;
      return store;
    }),
    entryGoDown: () => update(store => {
      let currDocId = store.currentDocId;
      let cursorEntryId = store.cursorEntryId;
      let currTree = store.documents[currDocId].tree;
      let hasEntryBelow = currTree.hasEntryBelow(cursorEntryId);
      let newEntryId = hasEntryBelow ? currTree.getEntryIdBelowWithCollapse(cursorEntryId) : cursorEntryId;
      store.cursorEntryId = newEntryId;
      return store;
    }),

    collapseEntry: (entryId) => update(store => {
      // check if display state is collapsed, and, if so, expand
      if (entryId != null) {
        let docId = store.currentDocId;

        let currDoc = store.documents[docId];
        let currTree = currDoc.tree;
        let currHasChildren = currTree.getEntryItem(entryId).value.hasChildren();

        if (currHasChildren && currTree.getEntryDisplayState(entryId) === EntryDisplayState.EXPANDED) {
          let newTree = new FlowyTree(currTree.getEntries(), currTree.getRoot());
          newTree.setEntryDisplayState(entryId, EntryDisplayState.COLLAPSED)
          currDoc.tree = newTree;
        }
      }
      return store;
    }),

    expandEntry: (entryId) => update(store => {
      if (entryId != null) {
        let docId = store.currentDocId;

        let currDoc = store.documents[docId];
        let currTree = currDoc.tree;
        let currHasChildren = currTree.getEntryItem(entryId).value.hasChildren();

        if (currHasChildren && currTree.getEntryDisplayState(entryId) === EntryDisplayState.COLLAPSED) {
          let newTree = new FlowyTree(currTree.getEntries(), currTree.getRoot());
          newTree.setEntryDisplayState(entryId, EntryDisplayState.EXPANDED)
          currDoc.tree = newTree;
        }
      }
      return store;
    }),

    indentEntry: () => update(store => {
      let docId = store.currentDocId;
      let entryId = store.cursorEntryId;
      let currTree = store.documents[docId].tree;
      let currItem = currTree.getEntryItem(entryId);

      if (currTree.hasPrevSibling(entryId)) {
        let prevNode = currTree.getPrevSiblingNode(entryId);
        currItem.detach();
        prevNode.appendChildItem(currItem);
        let parentId = prevNode.getId();
        currItem.value.setParentId(parentId);
        store.documents[docId].lastUpdated = getNowISO8601();
      }

      return store;
    }),
    dedentEntry: () => update(store => {
      let docId = store.currentDocId;
      let entryId = store.cursorEntryId;
      let currTree = store.documents[docId].tree;
      let currItem = currTree.getEntryItem(entryId);

      if (currItem.value.hasParent()) {
        let parentItem = currTree.getEntryItem(currItem.value.getParentId());
        currItem.detach();
        parentItem.append(currItem);
        let parentParentId = parentItem.value.getParentId();
        currItem.value.setParentId(parentParentId);
        store.documents[docId].lastUpdated = getNowISO8601();
      }

      return store;
    }),
    splitEntry: () => update(store => {
      let docId = store.currentDocId;
      let entryId = store.cursorEntryId;
      let cursorPos = store.cursorSelectionStart;

      // TODO: only update documents if there's a docId (is this possible?)
      let currDoc = store.documents[docId];
      let currTree = currDoc.tree;
      let currEntryText = currTree.getEntryText(entryId);
      let parentId = currTree.getParentId(entryId);


      // presto-removo the selected text
      if (store.cursorSelectionStart !== store.cursorSelectionEnd) {
        currEntryText = currEntryText.substring(0, store.cursorSelectionStart) + currEntryText.substring(store.cursorSelectionEnd);
        console.log(" >> split, (entryId, text) = ", entryId, currEntryText);
        currTree.setEntryText(entryId, currEntryText);
        store.cursorSelectionEnd = store.cursorSelectionStart;
      }

      // if at the end of a collapsed item, make a next sibling with empty text
      if (currTree.getEntryDisplayState(entryId) === EntryDisplayState.COLLAPSED
          && cursorPos === currEntryText.length) {

        let newId = currDoc.tree.insertEntryBelow(entryId, parentId, '');
        store.cursorEntryId = newId;
        store.cursorSelectionStart = 0;
        return store;
      }

      let newEntryText = currEntryText.substring(0, cursorPos);
      let updatedCurrEntry = currEntryText.substring(cursorPos, currEntryText.length);
      currDoc.tree.setEntryText(entryId, updatedCurrEntry);
      currDoc.tree.insertEntryAbove(entryId, parentId, newEntryText);

      store.cursorSelectionStart = 0;
      store.cursorSelectionEnd = store.cursorSelectionStart;

      return store;
    }),

    backspaceEntry: () => update(store => {
      let currentDoc = store.documents[store.currentDocId];
      let cursorPos = store.cursorSelectionStart;
      let entryId = store.cursorEntryId;

      // delete single-entry selection
      if (store.cursorSelectionStart !== store.cursorSelectionEnd) {
        let currEntryText = currentDoc.tree.getEntryText(entryId);
        let newEntry = currEntryText.substring(0, store.cursorSelectionStart) + currEntryText.substring(store.cursorSelectionEnd);
        currentDoc.tree.setEntryText(entryId, newEntry);
        store.cursorSelectionEnd = store.cursorSelectionStart;
        return store;
      }



      if (cursorPos > 0) {
        let currEntryText = currentDoc.tree.getEntryText(entryId);
        let currTextLength = currEntryText.length;
        // FIXME
        // colId might be larger than the text length, so handle it
        let effectiveCursorPos = Math.min(cursorPos, currTextLength);
        let newEntry =
          currEntryText.substring(0, effectiveCursorPos - 1) + currEntryText.substring(effectiveCursorPos);
        currentDoc.tree.setEntryText(entryId, newEntry);

        store.cursorSelectionStart = effectiveCursorPos - 1;
        store.cursorSelectionEnd = store.cursorSelectionStart;
        return store;
      }


      // col is zero, so we merge adjacent entries
      let currTree = currentDoc.tree;

      // cases where backspacing @ col 0 is a no-op
      //  - if curr entry has no entry above (no parent, no previous sibling)
      //  - if current has children + previous sibling, and previous sibling has children
      //  - if current has children + no previous sibling
      if (currTree.hasEntryAbove(entryId)) {

        let currItem = currTree.getEntryItem(entryId);
        let prevItem = currItem.prev;
        if (currItem.value.hasChildren() && (prevItem == null || prevItem.value.hasChildren())) {
          // exit without change
          return store;
        }

        let currEntryText = currentDoc.tree.getEntryText(entryId);

        let newEntryId, newCursorPos;
        if (!currItem.value.hasChildren()) {
          // if current has no children, we delete current and append current's text
          // to previous entry.
          let prevEntryId = currTree.getEntryIdAboveWithCollapse(entryId);
          let prevRowOrigEntryText = currentDoc.tree.getEntryText(prevEntryId);
          currentDoc.tree.setEntryText(
            prevEntryId,
            prevRowOrigEntryText + currEntryText
          );
          currentDoc.tree.removeEntry(entryId);
          newEntryId = prevEntryId;
          newCursorPos = prevRowOrigEntryText.length;

        } else {
          // otherwise, current has children, and so if we had (prevItem == null || prevItem.value.hasChildren()), then
          // we would have aborted the backspace.
          // thus we must either have (prevItem exists && has no children)
          // so: delete previous, prepend its text to current element
          let prevEntryId = currTree.getEntryIdAbove(entryId);
          let prevRowOrigEntryText = currentDoc.tree.getEntryText(prevEntryId);

          currentDoc.tree.setEntryText(
            entryId,
            prevRowOrigEntryText + currEntryText
          );
          currentDoc.tree.removeEntry(prevEntryId);
          newEntryId = entryId;
          newCursorPos = prevRowOrigEntryText.length;
        }

        store.cursorEntryId = newEntryId;
        store.cursorSelectionStart = newCursorPos;
        store.cursorSelectionEnd = store.cursorSelectionStart;
      }

      return store;

    }),

    savePastedEntries: (newDocEntryText) => update(store => {
      console.log(" saved pasted entries act");
      let i = store.currentDocId;
      let entryId = store.cursorEntryId;
      let currentDoc = store.documents[i];
      let parentId = currentDoc.tree.getParentId(entryId);
      console.log(" SPEA, (doc id, entry id, parent id) = ", i, entryId, parentId);

      let currEntryId = entryId;
      newDocEntryText.split('\n').forEach(line => {
        console.log("inserting below ", currEntryId, " line = ", line);
        currEntryId = currentDoc.tree.insertEntryBelow(currEntryId, parentId, line);
      });

      return store;
    }),

    // compute the diff between the current set of links and the new set
    //  - NOTE: we start with the new set of linked *page names*, so we need to look up doc ids
    //     - whenever we find a page name with no doc id, need to automatically create
    // for each removed and added link in the entry, update the link graph
    // return { updated LinkGraph, updated documents object }
    updateEntryLinks: (entryId, pageNames) => update(store => {
      let currLinks = store.linkGraph.getLinks(store.currentDocId, entryId);

      let newLinksArray = pageNames.map(page => {
        let lookupResult = store.docIdLookupByDocName[page];
        if (lookupResult) {
          return lookupResult;
        }

        // FIXME: duplicates some from createDocAction
        let newDoc = createNewDocument(page, 'TODO', store.documents);
        let newId = newDoc.id;
        store.documents[newId] = newDoc;
        store.docsDisplay[newId] = createDocsDisplayEntry(newId);
        store.docIdLookupByDocName[page] = newId;
        return newId;
      });
      let newLinks = new Set(newLinksArray);

      // diff currLinks, newLinks
      let [removed, added] = diffSets(currLinks, newLinks);

      removed.forEach(docId => {
        store.linkGraph.removeLink(store.currentDocId, entryId, docId);
      });
      added.forEach(docId => {
        store.linkGraph.addLink(store.currentDocId, entryId, docId);
      });

      return store;
    }),

    swapWithAboveEntry: () => update(store => {
      let cursorEntryId = store.cursorEntryId;
      let currDoc = store.documents[store.currentDocId];
      let currTree = currDoc.tree;

      if (currTree.hasPrevSibling(cursorEntryId)) {
        let prevSiblingNode =  currTree.getPrevSiblingNode(cursorEntryId);
        let prevSiblingId = prevSiblingNode.getId();
        currTree.swapAdjacentSiblings(prevSiblingId, cursorEntryId);
        currDoc.lastUpdated = getNowISO8601();
      }
      return store;
    }),
    swapWithBelowEntry: () => update(store => {
      let cursorEntryId = store.cursorEntryId;
      let currDoc = store.documents[store.currentDocId];
      let currTree = currDoc.tree;

      if (currTree.hasNextSibling(cursorEntryId)) {
        let nextSiblingNode =  currTree.getNextSiblingNode(cursorEntryId);
        let nextSiblingId = nextSiblingNode.getId();
        currTree.swapAdjacentSiblings(cursorEntryId, nextSiblingId);
        currDoc.lastUpdated = getNowISO8601();
      }
      return store;
    }),

    // "1, 2, 3, 0"
    cycleEntryHeadingSize: (entryId) => update(store => {
      let currDoc = store.documents[store.currentDocId];
      let currTree = currDoc.tree;
      currTree.cycleEntryHeadingSize(entryId);
      return store;
    }),

  }
}

export const docsStore = createDocsStore();
