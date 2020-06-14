import { EntryDisplayState } from './data.js';

export function nodeToTreeObj(node) {
  if (node.hasChildren()) {
    let rootKey = node.getId() == null ? 'root' : ''+node.getId();
    let result = {};
    result[rootKey] = node.getChildNodeArray().map(item => nodeToTreeObj(item.value));
    return result;
  }
  return node.getId();
}

export function deserializeEntries(entriesObj) {
  let entries = { ...entriesObj };
  Object.entries(entries).map(([id, entry]) => {
    entry = { ...entry };
    entry.displayState = entry.displayState === 'COLLAPSED'
      ? EntryDisplayState.COLLAPSED
      : EntryDisplayState.EXPANDED;
    entries[id] = entry;
  });
  return entries;
}

export function serializeEntries(entries) {
  let entriesObj = { ...entries };
  Object.entries(entriesObj).map(([id, entry]) => {
    entry = { ...entry };
    entry.displayState = entry.displayState === EntryDisplayState.COLLAPSED
      ? 'COLLAPSED'
      : 'EXPANDED';
    entriesObj[id] = entry;
  });
  return entriesObj;
}