import { LinkedList } from "./LinkedList";

export default class FlowyTreeNode {
  constructor(id, parentId, children) {
    this.id = id;
    this.parentId = parentId;

    // LinkedList<FlowyTreeNode>
    this.children = children || new LinkedList();

    // Map<Int, LinkedList.Item>
    console.log("FTN, (id, pid) = ", id, parentId, " this.children = ", this.children);
  }

  getId() {
    return this.id;
  }

  hasChildren() {
    return this.children.size;
  }

  getChildren() {
    return this.children;
  }

  // TODO: rename to getChildItemArray?
  getChildNodeArray() {
    return this.children.toArray();
  }

  getLastChildNode() {
    return this.children.tail.value;
  }
}
