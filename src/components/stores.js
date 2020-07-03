import { writable } from 'svelte/store';

export const nextDocCursorEntryId = writable(null);
export const nextDocCursorColId = writable(0);
export const nextDocEntryText = writable('');
export const collapseExpandEntryId = writable(null);
export const updateLinksEntryId = writable(null);
export const updateLinksPageNames = writable(null);



function createDocDisplayStore() {
  let { subscribe, update } = writable({
    docName: '',
    nextDocName: ''
  });

  return {
    subscribe,
    saveNextDocName: (newNextDocName) => update(store => {
      store.nextDocName = newNextDocName;
      return store;
    }),
    saveDocName: (newDocName) => update(store => {
      store.docName = newDocName;
      return store;
    }),
    saveCurrentDocName: () => update(store => {
      store.docName = store.nextDocName;
      return store;
    })
  }
}

export const docDisplayStore = createDocDisplayStore();