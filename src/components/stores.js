import { writable } from 'svelte/store';

export const nextDocCursorEntryId = writable(null);
export const nextDocCursorColId = writable(0);
export const nextDocName = writable('');
export const nextDocEntryText = writable('');
export const collapseExpandEntryId = writable(null);
export const updateLinksEntryId = writable(null);
export const updateLinksPageNames = writable(null);



function createDocDisplayStore() {
  let { subscribe, update } = writable({
    docTitle: '',
  });

  return {
    subscribe,
    saveDocTitle: (newDocTitle) => update(store => {
      store.docTitle = newDocTitle;
      return store;
    })
  }
}

export const docDisplayStore = createDocDisplayStore();