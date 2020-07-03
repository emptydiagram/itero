import { writable } from 'svelte/store';

export const nextDocEntryText = writable('');
export const collapseExpandEntryId = writable(null);
export const updateLinksEntryId = writable(null);
export const updateLinksPageNames = writable(null);



function createDocDisplayStore() {
  let { subscribe, update } = writable({
    currentDocId: null,
    cursorColId: 0,
    cursorEntryId: null,
    docName: '',
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
  }
}

export const docDisplayStore = createDocDisplayStore();