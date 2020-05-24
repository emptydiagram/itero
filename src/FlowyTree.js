import { LinkedListItem } from "./LinkedList.js";
import FlowyTreeNode from './FlowyTreeNode.js'
import Queue from "./Queue.js";

// TODO: handle full trees
export default class FlowyTree {
  // entries: Map<EntryId, String>
  // root: FlowyTreeNode
  // entryItems: Map<EntryId, LinkedListItem<FlowyTreeNode>>
  constructor(entries, root) {
    this.entries = entries;
    // this.root = new FlowyTreeNode(null, null, entriesList);
    this.root = root;

    let q = new Queue();
    let entryItems = {};
    let item;
    console.log("## ## ## new FlowyTree, (entries, root) = ", entries, root);
    this.root.getChildNodeArray().forEach(it => q.add(it));
    while (!q.isEmpty()) {
      item = q.remove();
      entryItems[item.value.getId()] = item;
      item.value.getChildNodeArray().forEach(it => q.add(it));
    }

    console.log("## ## ## in new FlowyTree, entryItems = ", entryItems);
    this.entryItems = entryItems;
  }

  getEntries() {
    return this.entries;
  }

  getRoot() {
    return this.root;
  }

  getEntryTexts() {
    return this.root.getChildren().toArray().map(item => this.entries[item.value.getId()])
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

  // true iff it has a child or next sibling or if an ancestor has a next sibling
  hasEntryBelow(entryId) {
    let entryItem = this.entryItems[entryId];
    return entryItem.value.getChildren().size > 0
      || entryItem.next !== null
      || this.entryAncestorHasNextSibling(entryId);
  }

  getEntryIdBelow(entryId) {
    // return first child id, if it exists
    let ch = this.entryItems[entryId].value.getChildren();
    if (ch.size > 0) {
      return ch.head.value.getId();
    }

    // get next sibling if it exists
    if (this.entryItems[entryId].next !== null) {
      return this.entryItems[entryId].next.value.getId();
    }
    // there's no child and no next sibling, find first ancestor with a next sibling
    return this.getNextSiblingOfFirstAncestor(this.entryItems[entryId].value).getId();
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

  getEntry(entryId) {
    return this.entries[entryId];
  }

  getEntryItem(entryId) {
    return this.entryItems[entryId];
  }

  setEntry(entryId, value) {
    this.entries[entryId] = value;
  }

  getParentId(entryId) {
    return this.entryItems[entryId].value.parentId;
  }

  // returns: the id of the new entry (the one just inserted)
  insertEntryBelow(entryId, parentId, newEntry) {
    let existingIds = Object.keys(this.entries).map(id => parseInt(id));
    let newId = Math.max(...existingIds) + 1;
    this.entries[newId] = newEntry;

    let newNode = new LinkedListItem(new FlowyTreeNode(newId, parentId));
    //let prevNode = this.root.getChildren().get(index - 1);
    let prevItem = this.entryItems[entryId];
    prevItem.append(newNode);

    this.entryItems[newId] = newNode;
    return newId;
  }

  deleteAt(entryId) {
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
    console.log(` #**# getPrevSiblingNode, entryId = ${entryId}`);
    return this.entryItems[entryId].prev.value;
  }
}
