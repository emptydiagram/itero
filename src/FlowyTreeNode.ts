import { LinkedList, LinkedListItem } from "./LinkedList";
import type { EntryId } from './FlowyTree';

function isObject(obj) {
  return obj === Object(obj);
}

export default class FlowyTreeNode {
  private id: EntryId;
  private parentId: EntryId | null;
  private children: LinkedList;

  constructor(id: EntryId, parentId: EntryId | null, children?: LinkedList) {
    this.id = id;
    this.parentId = parentId;

    // LinkedList<FlowyTreeNode>
    this.children = children || new LinkedList();
  }

  // returns: a FlowyTreeNode which corresponds to the specification in treeObj
  static fromTreeObj(treeObj, parentId?: EntryId): FlowyTreeNode {
    let rootKey = Object.keys(treeObj)[0];
    let childTreeObjs = treeObj[rootKey];
    let currId: number | null = rootKey === "root" ? null : parseInt(rootKey);
    let nodesArray = Array.from(
      childTreeObjs,
      (child: object | number) => new LinkedListItem(
        isObject(child)
          ? FlowyTreeNode.fromTreeObj(child, currId)
          : new FlowyTreeNode(child as number, currId)));
    // a linked list of (LinkedListItems of) FlowyTreeNodes, one for each child in treeObj
    let nodesList = new LinkedList(...nodesArray);

    parentId = parentId === 0 ? parentId : (parentId || null);
    return new FlowyTreeNode(currId, parentId, nodesList);
  }

  getId(): EntryId {
    return this.id;
  }

  hasParent(): boolean {
    return this.parentId != null;
  }

  getParentId(): EntryId {
    return this.parentId;
  }

  setParentId(parentId: number) {
    this.parentId = parentId;
  }

  hasChildren(): boolean {
    return this.children.size > 0;
  }

  getChildren(): LinkedList {
    return this.children;
  }

  appendChildItem(item: LinkedListItem) {
    return this.children.append(item);
  }

  // TODO: rename to getChildItemArray?
  getChildNodeArray() {
    return this.children.toArray();
  }

  getLastChildNode(): FlowyTreeNode | null {
    // a quirk of the linked list library we use is that when the list has 1
    // element, tail = null
    if (this.children.size === 0) {
      return null;
    }
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
