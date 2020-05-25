import { LinkedList } from "./LinkedList";

export default class FlowyTreeNode {
  constructor(id, parentId, children) {
    this.id = id;
    this.parentId = parentId;

    // LinkedList<FlowyTreeNode>
    this.children = children || new LinkedList();
  }

  getId() {
    return this.id;
  }

  hasParent() {
    return this.parentId === 0 || this.parentId;
  }

  getParentId() {
    return this.parentId;
  }

  setParentId(parentId) {
    this.parentId = parentId;
  }

  hasChildren() {
    return this.children.size > 0;
  }

  getChildren() {
    return this.children;
  }

  appendChildItem(item) {
    return this.children.append(item);
  }

  // TODO: rename to getChildItemArray?
  getChildNodeArray() {
    return this.children.toArray();
  }

  getLastChildNode() {
    // a quirk of the linked list library we use is that when the list has 1
    // element, tail = null
    return this.children.size > 1
      ? this.children.tail.value
      : this.children.head.value;
  }
}
