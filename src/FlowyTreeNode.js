import { LinkedList } from "./LinkedList";

 export default class FlowyTreeNode {
  constructor(id, parentId, children) {
    this.id = id;
    this.parentId = parentId;

    // LinkedList<FlowyTreeNode>
    this.children = children || new LinkedList();

    // Map<Int, LinkedList.Item>
    console.log("FTN, (id, pid) = ", id, parentId, " this.children = ", this.children);
    this.childLookup = this.children.toArray();
  }

  getChildren() {
    return this.children;
  }
}
