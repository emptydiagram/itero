import { LinkedList, LinkedListItem } from './LinkedList.js';
import FlowyTreeNode from './FlowyTreeNode.js';
import { EntryDisplayState } from './data.js';

function isObject(obj) {
  return obj === Object(obj);
}

// returns: a FlowyTreeNode which corresponds to the specification in treeObj
export function treeObjToNode(treeObj, parentId) {
  let rootKey = Object.keys(treeObj)[0];
  let currNode = treeObj[rootKey];
  let currId = rootKey === "root" ? null : parseInt(rootKey);
  let nodesArray = Array.from(
    currNode,
    child => new LinkedListItem(
      isObject(child)
        ? treeObjToNode(child, currId)
        : new FlowyTreeNode(child, currId)));
  // a linked list of (LinkedListItems of) FlowyTreeNodes, one for each child in treeObj
  let nodesList = new LinkedList(...nodesArray);

  parentId = parentId === 0 ? parentId : (parentId || null);
  return new FlowyTreeNode(currId, parentId, nodesList);
}

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
  console.log("deserializeEntries, new entries = ", entries);
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
  console.log("serializeEntries, new entries = ", entriesObj);
  return entriesObj;
}