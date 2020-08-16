import Queue from "./Queue.js";
import { EntryDisplayState } from "./data";
import type { TreeObj } from "./data";

type EntryId = number;

export type FlowyTreeNode = OrderedTreeNode<EntryId>;

export interface FlowyTreeMarkupEntry {
  type: "markup-text";
  text: string;
  displayState?: EntryDisplayState;
  headingSize?: number;
}

// TODO: TableEntry
export interface FlowyTreeTableEntry {
  type: "table";
}

type FlowyTreeEntry = FlowyTreeMarkupEntry | FlowyTreeTableEntry;

export interface FlowyTreeEntriesCollection {
  [entryId: number]: FlowyTreeEntry
}


export class FlowyTree {
  private entries: FlowyTreeEntriesCollection;
  private root: FlowyTreeNode;
  private nodeLookup: { [entryId: number]: FlowyTreeNode }

  constructor(entries: FlowyTreeEntriesCollection, root: FlowyTreeNode) {
    this.entries = entries;
    this.root = root;

    let q = new Queue();
    let nodeLookup = {};
    let node: FlowyTreeNode;
    this.root.forEachChildNode(ch => q.add(ch));
    while (!q.isEmpty()) {
      node = q.remove();
      nodeLookup[node.getValue()] = node;
      node.forEachChildNode(ch => q.add(ch));
    }

    this.nodeLookup = nodeLookup;
  }

  getEntries(): FlowyTreeEntriesCollection {
    return this.entries;
  }

  getEntryNode(entryId: number): FlowyTreeNode {
    return this.nodeLookup[entryId];
  }

  getEntryDisplayState(entryId: number): EntryDisplayState {
    let entry = this.entries[entryId];
    if (!entry || entry.type !== "markup-text") {
      return;
    }

    return (entry != null) && ('displayState' in entry)
      ? entry.displayState
      : EntryDisplayState.Expanded;
  }

  getEntryHeadingSize(entryId: number) {
    let entry = this.entries[entryId];
    if (!entry || entry.type !== "markup-text") {
      return;
    }
    return 'headingSize' in entry ? entry.headingSize : 0;
  }

  getEntryText(entryId: number): string {
    let entry = this.entries[entryId];
    if (!entry || entry.type !== "markup-text") {
      return;
    }
    return entry.text;
  }

  getEntryIdAbove(entryId: EntryId): EntryId | null {
    let node = this.nodeLookup[entryId];
    if (node.hasPrev()) {
      return this.getLastAncestorNode(node.getPrev()).getValue();
    }

    // return the parentId, or null if none
    let maybeParentId = node.getParent()?.getValue();
    return maybeParentId === undefined ? null : maybeParentId;
  }

  getEntryIdAboveWithCollapse(entryId: EntryId): EntryId {
    // find if the entry id above is the child of a collapsed node, and if so go to the last one
    let aboveId = this.getEntryIdAbove(entryId);

    // traverse ancestor chain, looking for earliest collapsed ancestor
    let oldestId = null;
    let currNode: FlowyTreeNode = this.nodeLookup[aboveId].getParent();

    while (currNode != null) {
      // check if current is collapsed
      let currDisplayState = this.getEntryDisplayState(currNode.getValue());
      if (currDisplayState === EntryDisplayState.Collapsed) {
        oldestId = currNode;
      }
      currNode = currNode.getParent();
    }

    return oldestId == null ? aboveId : oldestId;
  }

  getEntryIdBelowWithCollapse(entryId: EntryId): EntryId | null {
    // if entry is collapsed ignore children
    if (this.getEntryDisplayState(entryId) !== EntryDisplayState.Collapsed) {
      // return first child id, if it exists
      let ch = this.nodeLookup[entryId].getFirstChild();
      if (ch != null) {
        return ch.getValue();
      }
    }

    // get next sibling if it exists
    if (this.hasNextSibling(entryId)) {
      return this.getNextSiblingNode(entryId).getValue();
    }
    // there's no child and no next sibling, find first ancestor with a next sibling
    let nextSib = this.getNextSiblingOfFirstAncestor(this.nodeLookup[entryId]);
    return nextSib ? nextSib.getValue() : null;
  }


  getLastAncestorNode(node: FlowyTreeNode): FlowyTreeNode {
    let curr = node;
    while (curr.hasChildren()) {
      curr = curr.getLastChild();
    }
    return curr;
  }

  getNextSiblingOfFirstAncestor(node: FlowyTreeNode): FlowyTreeNode {
    // while there's a parent
    //   check if parent node has a next sibling
    //   if yes, return it
    // return null
    let currId = node.getValue();
    while (this.hasParent(currId)) {
      currId = this.nodeLookup[currId].getParent().getValue();
      if (this.nodeLookup[currId].hasNext()) {
        return this.nodeLookup[currId].getNext();
      }
    }
    return null;
  }



  getRoot(): FlowyTreeNode {
    return this.root;
  }

  hasChildren(entryId: EntryId): boolean {
    return this.nodeLookup[entryId].hasChildren();
  }

  hasParent(entryId: EntryId): boolean {
    // in a flowy tree we always use a node with a null value for the root node
    // that means that when checking for whether there's a "parent" in the flowytree
    // sense, we can't simply call getParent() on the entry
    let node = this.nodeLookup[entryId];
    return node.hasParent() && node.getParent().getValue() != null;
  }

  hasPrevSibling(entryId: EntryId): boolean {
    return this.nodeLookup[entryId].hasPrev();
  }

  hasNextSibling(entryId: EntryId): boolean {
    return this.nodeLookup[entryId].hasNext();
  }

  getPrevSiblingNode(entryId) {
    return this.nodeLookup[entryId].getPrev();
  }

  getNextSiblingNode(entryId) {
    return this.nodeLookup[entryId].getNext();
  }



  hasEntryAbove(entryId: EntryId) {
    return this.nodeLookup[entryId].hasPrev()
      || this.hasParent(entryId)
  }

  // true iff it has a child or next sibling or if an ancestor has a next sibling
  hasEntryBelow(entryId: EntryId): boolean {
    return this.nodeLookup[entryId].hasChildren()
      || this.nodeLookup[entryId].hasNext()
      || this.entryAncestorHasNextSibling(entryId);
  }

  entryAncestorHasNextSibling(entryId: EntryId): boolean {
    if (!this.hasParent(entryId)) {
      return false;
    }
    let node = this.nodeLookup[entryId];

    // while there's a parent
    //   check if parent node has a next sibling
    //   if yes, return true
    // return false
    let currId = node.getValue();
    while (this.hasParent(currId)) {
      currId = this.nodeLookup[currId].getParent().getValue();
      if (this.nodeLookup[currId].hasNext()) {
        return true;
      }
    }
    return false;
  }

  createMarkupEntry(entryId: EntryId, textValue: string) {
    if (entryId in this.entries) {
      return;
    }
    this.entries[entryId] = {
      type: "markup-text",
      text: textValue
    };
  }

  setEntryText(entryId: EntryId, textValue: string) {
    let entry = this.entries[entryId];
    if (!entry || entry.type !== "markup-text") {
      return;
    }

    entry.text = textValue;
  }

  setEntryDisplayState(entryId: EntryId, newState: EntryDisplayState) {
    let entry = this.entries[entryId];
    if (!entry || entry.type !== "markup-text") {
      return;
    }
    entry.displayState = newState;
  }

  insertEntryBelow(entryId: EntryId, parentId: EntryId, newEntryText: string): EntryId {
    // TODO: dedupe with insertEntryAbove
    let existingIds = Object.keys(this.entries).map(id => parseInt(id));
    let newId = Math.max(...existingIds) + 1;
    this.createMarkupEntry(newId, newEntryText);

    let newNode = OrderedTreeNode.createWithParent(newId, this.nodeLookup[parentId]);
    let baseNode = this.nodeLookup[entryId];
    baseNode.appendSiblingNode(newNode);

    this.nodeLookup[newId] = newNode;
    return newId;
  }

  insertEntryAbove(entryId: EntryId, parentId: EntryId, newEntryText: string): EntryId {
    let existingIds = Object.keys(this.entries).map(id => parseInt(id));
    let newId = Math.max(...existingIds) + 1;
    this.createMarkupEntry(newId, newEntryText);

    let newNode: FlowyTreeNode = OrderedTreeNode.createWithParent(newId, this.nodeLookup[parentId]);
    let baseNode = this.nodeLookup[entryId];
    baseNode.prependSiblingNode(newNode);

    this.nodeLookup[newId] = newNode;
    return newId;
  }

  removeEntry(entryId: EntryId) {
    let node = this.nodeLookup[entryId];
    delete this.entries[entryId];
    node.detach();
    delete this.nodeLookup[entryId];
  }

  // (entryIdA, entryIdB) must be (previous, next)
  swapAdjacentSiblings(entryIdA: EntryId, entryIdB: EntryId) {
    let nodeA = this.getEntryNode(entryIdA);
    let nodeB = this.getEntryNode(entryIdB);
    if (nodeA.getNext() !== nodeB) {
      return
    }
    nodeA.detach();
    nodeB.appendSiblingNode(nodeA);
  }

  cycleEntryHeadingSize(entryId: EntryId) {
    let entry = this.entries[entryId];
    if (!entry || entry.type !== "markup-text") {
      return;
    }
    let currHeadingSize = entry.headingSize || 0;
    entry.headingSize = (currHeadingSize + 1) % 4;
  }
}


export class OrderedTreeNode<E> {
  private value: E;
  // only the root node has parent = null
  private parent: OrderedTreeNode<E> | null;
  private prev: OrderedTreeNode<E> | null;
  private next: OrderedTreeNode<E> | null;
  private firstChild: OrderedTreeNode<E> | null;
  private lastChild: OrderedTreeNode<E> | null;

  static create<E>(value: E): OrderedTreeNode<E> {
    return new OrderedTreeNode(value);
  }

  static createWithParent<E>(value: E, parent: OrderedTreeNode<E>): OrderedTreeNode<E> {
    let node = OrderedTreeNode.create(value);
    node.parent = parent;
    return node;
  }

  constructor(value: E) {
    this.value = value;
    this.parent = null;
    this.prev = null;
    this.next = null;
    this.firstChild = null;
    this.lastChild = null;
  }

  forEachChildNode(fn: (child: OrderedTreeNode<E>) => void) {
    let child = this.firstChild;
    while (child != null) {
      fn(child);
      child = child.next;
    }
  }

  getChildNodeArray(): Array<OrderedTreeNode<E>> {
    let results = [];
    this.forEachChildNode((child: OrderedTreeNode<E>) => {
      results.push(child);
    })
    return results;
  }

  getFirstChild(): OrderedTreeNode<E> | null {
    return this.firstChild;
  }

  getLastChild(): OrderedTreeNode<E> | null {
    return this.lastChild;
  }

  getNext(): OrderedTreeNode<E> | null {
    return this.next;
  }

  getParent(): OrderedTreeNode<E> | null {
    return this.parent;
  }

  getPrev(): OrderedTreeNode<E> | null {
    return this.prev;
  }

  getValue(): E {
    return this.value;
  }

  hasChildren(): boolean {
    return this.firstChild != null;
  }

  hasNext(): boolean {
    return this.next != null;
  }

  hasParent(): boolean {
    return this.parent != null;
  }

  hasPrev(): boolean {
    return this.prev != null;
  }

  prependSiblingNode(node: OrderedTreeNode<E>) {
    if (this.hasPrev()) {
      this.prev.next = node;
      node.prev = this.prev;
    } else {
      // since no previous, this is the new first child.
      this.parent.firstChild = node;
    }

    this.prev = node;
    node.next = this;
    node.parent = this.parent
  }

  appendSiblingNode(node: OrderedTreeNode<E>) {
    if (this.hasNext()) {
      this.next.prev = node;
      node.next = this.next;
    } else {
      // since no next, this is the new last child.
      this.parent.lastChild = node;
    }

    this.next = node;
    node.prev = this;
    node.parent = this.parent
  }

  detach() {
    if (!this.hasParent()) {
      // only the root note has no parent. detaching the root node is a no-op
      return;
    }
    let prev = this.prev;
    let next = this.next;

    if (prev && next) {
      prev.next = next;
      next.prev = prev;
    } else if (!prev && next) {
      next.prev = null;
      this.parent.firstChild = next;
    } else if (prev && !next) {
      prev.next = null;
      this.parent.lastChild = prev;
    } else {
      this.parent.firstChild = null;
      this.parent.lastChild = null;
    }
    this.prev = null;
    this.next = null;
  }

  appendChild(node: OrderedTreeNode<E>) {
    if (this.firstChild == null) {
      this.firstChild = node;
      this.lastChild = node;
    } else {
      this.lastChild.next = node;
      node.prev = this.lastChild;
      this.lastChild = node;
    }
    node.parent = this;
  }


}

function isObject(obj) {
  return obj === Object(obj);
}

export class FlowyTreeNodeConverter {
  static toTreeObj(node: FlowyTreeNode): TreeObj {
    if (node.hasChildren()) {
      let rootKey = node.getValue() == null ? 'root' : '' + node.getValue();
      let result = {};
      let childArray = [];
      node.forEachChildNode(child => {
        childArray.push(FlowyTreeNodeConverter.toTreeObj(child));
      });
      result[rootKey] = childArray;
      return result;
    }
    return node.getValue();
  }

  static createFromTreeObj(treeObj: TreeObj): FlowyTreeNode {
    let rootKey = Object.keys(treeObj)[0];
    let childTreeObjs = treeObj[rootKey];
    let currId: number | null = rootKey === "root" ? null : parseInt(rootKey);

    let node = currId == null
      ? OrderedTreeNode.create(null)
      : OrderedTreeNode.create(currId);

    childTreeObjs.forEach(childObj => {
      let childNode = isObject(childObj)
        ? FlowyTreeNodeConverter.createFromTreeObj(childObj)
        : OrderedTreeNode.create(childObj as number);
      node.appendChild(childNode);
    });

    return node;

  }

}
