import { LinkedList, LinkedListItem } from './LinkedList.js';
import FlowyTreeNode from './FlowyTreeNode.js';

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
    throw 'not yet implemented'
}