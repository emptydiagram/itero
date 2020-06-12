import { writable } from 'svelte/store';

export const nextDocCursorEntryId = writable(null);
export const nextDocCursorColId = writable(0);
export const nextDocName = writable('');
export const nextDocEntryText = writable('');
