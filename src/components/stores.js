import { writable } from 'svelte/store';


function createDocsStore() {
  let { subscribe, update } = writable({
    collapseExpandEntryId: null,
    currentDocId: null,
    cursorColId: 0,
    cursorEntryId: null,
    docName: '',
    docsDisplayList: [],
    docIdLookupByDocName: {},
    nextDocEntryText: '',
    updateLinksEntryId: null,
    updateLinksPageNames: null,
    documents: {},
  });

  return {
    subscribe,
    init: (documents, docIdLookupByDocName) => update(store => {
      store.docsDisplayList = Object.keys(documents);
      store.docIdLookupByDocName = docIdLookupByDocName;
      store.documents = documents;
      return store;
    }),
    saveCollapseExpandEntryId: (newCollapseExpandEntryId) => update(store => {
      store.collapseExpandEntryId = newCollapseExpandEntryId;
      return store;
    }),
    saveCurrentDocId: (newCurrentDocId) => update(store => {
      store.currentDocId = newCurrentDocId;
      return store;
    }),
    saveDocName: (newDocName) => update(store => {
      store.docName = newDocName;
      return store;
    }),
    saveCursor: (newEntryId, newColId) => update(store => {
      store.cursorColId = newColId;
      store.cursorEntryId = newEntryId;
      return store;
    }),
    saveCursorColId: (newColId) => update(store => {
      store.cursorColId = newColId;
      return store;
    }),
    saveCursorEntryId: (newEntryId) => update(store => {
      store.cursorEntryId = newEntryId;
      return store;
    }),
    saveNextDocEntryText: (newNextDocEntryText) => update(store => {
      store.nextDocEntryText = newNextDocEntryText;
      return store;
    }),
    saveUpdateLinksEntryId: (entryId) => update(store => {
      store.updateLinksEntryId = entryId;
      return store;
    }),
    saveUpdateLinksPageNames: (pageNames) => update(store => {
      store.updateLinksPageNames = pageNames;
      return store;
    }),

    putDocIdLookup: (docName, docId) => update(store => {
      store.docIdLookupByDocName[docName] = docId;
      return store;
    }),
    removeDocIdLookup: (docName) => update(store => {
      delete store.docIdLookupByDocName[docName];
      return store;
    }),

    appendToDocsDisplayList: (newDocId) => update(store => {
      store.docsDisplayList.push(newDocId);
      return store;
    }),
    entryGoUp: (documents) => update(store => {
      let currDocId = store.currentDocId;
      let cursorEntryId = store.cursorEntryId;
      let currTree = documents[currDocId].tree;
      let hasEntryAbove = currTree.hasEntryAbove(cursorEntryId);
      let newEntryId = hasEntryAbove ? currTree.getEntryIdAboveWithCollapse(cursorEntryId) : cursorEntryId;
      store.cursorEntryId = newEntryId;
      return store;
    }),
    entryGoDown: (documents) => update(store => {
      let currDocId = store.currentDocId;
      let cursorEntryId = store.cursorEntryId;
      let currTree = documents[currDocId].tree;
      let hasEntryBelow = currTree.hasEntryBelow(cursorEntryId);
      let newEntryId = hasEntryBelow ? currTree.getEntryIdBelowWithCollapse(cursorEntryId) : cursorEntryId;
      store.cursorEntryId = newEntryId;
      return store;
    }),

  }
}

export const docsStore = createDocsStore();
