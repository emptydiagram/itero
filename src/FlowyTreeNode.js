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
    return this.children.size;
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
    return this.children.tail.value;
  }
}
