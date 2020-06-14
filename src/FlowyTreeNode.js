import { LinkedList, LinkedListItem } from "./LinkedList";

function isObject(obj) {
  return obj === Object(obj);
}

export default class FlowyTreeNode {
  constructor(id, parentId, children) {
    this.id = id;
    this.parentId = parentId;

    // LinkedList<FlowyTreeNode>
    this.children = children || new LinkedList();
  }

  // returns: a FlowyTreeNode which corresponds to the specification in treeObj
  static fromTreeObj(treeObj, parentId) {
    let rootKey = Object.keys(treeObj)[0];
    let currNode = treeObj[rootKey];
    let currId = rootKey === "root" ? null : parseInt(rootKey);
    let nodesArray = Array.from(
      currNode,
      child => new LinkedListItem(
        isObject(child)
          ? FlowyTreeNode.fromTreeObj(child, currId)
          : new FlowyTreeNode(child, currId)));
    // a linked list of (LinkedListItems of) FlowyTreeNodes, one for each child in treeObj
    let nodesList = new LinkedList(...nodesArray);

    parentId = parentId === 0 ? parentId : (parentId || null);
    return new FlowyTreeNode(currId, parentId, nodesList);
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

  toTreeObj() {
    if (this.hasChildren()) {
      let rootKey = this.getId() == null ? 'root' : ''+this.getId();
      let result = {};
      result[rootKey] = this.getChildNodeArray().map(item => item.value.toTreeObj());
      return result;
    }
    return this.getId();
  }

}
