import { writable } from 'svelte/store';

export const nextDocCursorEntryId = writable(null);
export const nextDocCursorColId = writable(0);
export const nextDocEntryText = writable('');
export const collapseExpandEntryId = writable(null);
export const updateLinksEntryId = writable(null);
export const updateLinksPageNames = writable(null);



function createDocDisplayStore() {
  let { subscribe, update } = writable({
    currentDocId: null,
    docName: '',
    nextDocName: '',
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
    saveNextDocName: (newNextDocName) => update(store => {
      store.nextDocName = newNextDocName;
      return store;
    }),

    // TODO: this name is confusing
    saveCurrentDocName: () => update(store => {
      store.docName = store.nextDocName;
      return store;
    }),
  }
}

export const docDisplayStore = createDocDisplayStore();