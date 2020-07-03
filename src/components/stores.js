import { writable } from 'svelte/store';

export const nextDocEntryText = writable('');
export const collapseExpandEntryId = writable(null);
export const updateLinksEntryId = writable(null);
export const updateLinksPageNames = writable(null);



function createDocsStore() {
  let { subscribe, update } = writable({
    currentDocId: null,
    cursorColId: 0,
    cursorEntryId: null,
    docName: '',
    docsDisplayList: [],
    docIdLookupByDocName: {},
  });

  return {
    subscribe,
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

    initDocIdLookup: (lookup) => update(store => {
      store.docIdLookupByDocName = lookup;
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

    initDocsDisplayList: (documents) => update(store => {
      store.docsDisplayList = Object.keys(documents);
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
