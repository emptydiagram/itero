import { LinkedListItem } from "./LinkedList.js";
import FlowyTreeNode from './FlowyTreeNode.js'
import Queue from "./Queue.js";
import { EntryDisplayState } from "./data.js";

// TODO: handle full trees
export default class FlowyTree {
  // entries: Map<EntryId, Object>
  // root: FlowyTreeNode
  // entryItems: Map<EntryId, LinkedListItem<FlowyTreeNode>>
  constructor(entries, root) {
    this.entries = entries;
    // this.root = new FlowyTreeNode(null, null, entriesList);
    this.root = root;

    let q = new Queue();
    let entryItems = {};
    let item;
    this.root.getChildNodeArray().forEach(it => q.add(it));
    while (!q.isEmpty()) {
      item = q.remove();
      entryItems[item.value.getId()] = item;
      item.value.getChildNodeArray().forEach(it => q.add(it));
    }

    this.entryItems = entryItems;
  }

  getEntries() {
    return this.entries;
  }

  getRoot() {
    return this.root;
  }

  getEntryTexts() {
    return this.root.getChildren().toArray().map(item => this.entries[item.value.getId()].text)
  }

  hasEntryAbove(entryId) {
    return this.entryItems[entryId].prev !== null
      || this.entryItems[entryId].value.getParentId() !== null;
  }


  getLastAncestorNode(node) {
    let curr = node;
    while (curr.hasChildren()) {
      curr = curr.getLastChildNode();
    }
    return curr;
  }

  getNextSiblingOfFirstAncestor(node) {
    // while there's a parent
    //   check if parent node has a next sibling
    //   if yes, return it
    // return null
    let currId = node.getId();
    while (this.entryItems[currId].value.hasParent()) {
      currId = this.entryItems[currId].value.getParentId();
      if (this.entryItems[currId].next) {
        return this.entryItems[currId].next.value;
      }
    }
    return null;
  }

  getEntryIdAbove(entryId) {
    if (this.entryItems[entryId].prev !== null) {
      let prevNode = this.entryItems[entryId].prev.value;
      return this.getLastAncestorNode(prevNode).getId();
    }

    // return the parentId, or null if none
    return this.entryItems[entryId].value.parentId;
  }

  getEntryIdAboveWithCollapse(entryId) {
    // TODO: find if the entry id above is the child of a collapsed node, and if so go to the last one
    let provId = this.getEntryIdAbove(entryId);

    // traverse ancestor chain, looking for earliest collapsed ancestor
    let oldestId = null;
    let currId = this.getEntryItem(provId).value.getParentId();

    while (currId != null) {
      // check if current is collapsed
      if (this.getEntryDisplayState(currId) === EntryDisplayState.COLLAPSED) {
        oldestId = currId;
      }
      currId = this.getEntryItem(currId).value.getParentId();
    }

    return oldestId == null ? provId : oldestId;
  }

  // true iff it has a child or next sibling or if an ancestor has a next sibling
  hasEntryBelow(entryId) {
    let entryItem = this.entryItems[entryId];
    return entryItem.value.getChildren().size > 0
      || entryItem.next !== null
      || this.entryAncestorHasNextSibling(entryId);
  }

  getEntryIdBelowWithCollapse(entryId) {
    // if entry is collapsed ignore children
    if (this.getEntryDisplayState(entryId) !== EntryDisplayState.COLLAPSED) {
      // return first child id, if it exists
      let ch = this.entryItems[entryId].value.getChildren();
      if (ch.size > 0) {
        return ch.head.value.getId();
      }
    }

    // get next sibling if it exists
    if (this.entryItems[entryId].next !== null) {
      return this.entryItems[entryId].next.value.getId();
    }
    // there's no child and no next sibling, find first ancestor with a next sibling
    let nextSib = this.getNextSiblingOfFirstAncestor(this.entryItems[entryId].value);
    return nextSib ? nextSib.getId() : null;
  }


  entryAncestorHasNextSibling(entryId) {
    let node = this.entryItems[entryId].value;
    if (node.parentId === null) {
      return false;
    }

    // while there's a parent
    //   check if parent node has a next sibling
    //   if yes, return true
    // return false
    let currId = node.getId();
    while (this.entryItems[currId].value.parentId !== null) {
      currId = this.entryItems[currId].value.parentId;
      if (this.entryItems[currId].next) {
        return true;
      }
    }
    return false;
  }

  getEntryText(entryId) {
    return this.entries[entryId].text;
  }

  getEntryDisplayState(entryId) {
    let val = (this.entries[entryId] != null) && this.entries[entryId].displayState || EntryDisplayState.EXPANDED;
    return val;
  }

  getEntryItem(entryId) {
    return this.entryItems[entryId];
  }

  setEntryText(entryId, value) {
    if (this.entries[entryId] == null) {
      this.entries[entryId] = {};
    }
    this.entries[entryId].text = value;
  }

  setEntryDisplayState(entryId, newState) {
    if (this.entries[entryId] == null) {
      this.entries[entryId] = {};
    }
    this.entries[entryId].displayState = newState;
  }

  getParentId(entryId) {
    return this.entryItems[entryId].value.parentId;
  }

  // returns: the id of the new entry
  insertEntryBelow(entryId, parentId, newEntryText) {
    // TODO: dedupe with insertEntryAbove
    let existingIds = Object.keys(this.entries).map(id => parseInt(id));
    let newId = Math.max(...existingIds) + 1;
    this.setEntryText(newId, newEntryText);

    let newNode = new LinkedListItem(new FlowyTreeNode(newId, parentId));
    let prevItem = this.entryItems[entryId];
    prevItem.append(newNode);

    this.entryItems[newId] = newNode;
    return newId;
  }

  insertEntryAbove(entryId, parentId, newEntryText) {
    let existingIds = Object.keys(this.entries).map(id => parseInt(id));
    let newId = Math.max(...existingIds) + 1;
    this.setEntryText(newId, newEntryText);

    let newNode = new LinkedListItem(new FlowyTreeNode(newId, parentId));
    let prevItem = this.entryItems[entryId];
    prevItem.prepend(newNode);

    this.entryItems[newId] = newNode;
  }

  // returns: the id of the new entry (the one just inserted)

  removeEntry(entryId) {
    let item = this.entryItems[entryId];
    delete this.entries[entryId];
    item.detach();
  }

  size() {
    return this.entries.length;
  }

  hasPrevSibling(entryId) {
    return this.entryItems[entryId].prev !== null;
  }

  getPrevSiblingNode(entryId) {
    return this.entryItems[entryId].prev.value;
  }
}
