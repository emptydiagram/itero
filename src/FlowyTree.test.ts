import { FlowyTreeEntriesCollection, FlowyTreeNode, OrderedTreeNode, FlowyTree, FlowyTreeNodeConverter } from "./FlowyTree";

test('Constructs singleton FlowyTree', () => {
  let entries: FlowyTreeEntriesCollection;
  let root: FlowyTreeNode = new OrderedTreeNode(null);
  const entryId = 234;
  root.appendChild(new OrderedTreeNode(entryId));
  let tree = new FlowyTree(entries, root);

  expect(root.getValue()).toBeNull();
  expect(root.hasChildren()).toBe(true);
  expect(root.getFirstChild().getValue()).toBe(entryId);
});

test('Constructs simple FlowyTree', () => {
  let treeObj = { "root": [100, { 200: [300] }] };
  let node = FlowyTreeNodeConverter.createFromTreeObj(treeObj);
  let entries: FlowyTreeEntriesCollection;
  let tree = new FlowyTree(entries, node);

  expect(node.getValue()).toBeNull();
  expect(node.hasChildren()).toBe(true);
  expect(node.getFirstChild().getValue()).toBe(100);
  expect(node.getFirstChild().hasChildren()).toBe(false);
  expect(node.getLastChild().getValue()).toBe(200);
  expect(node.getLastChild().hasChildren()).toBe(true);
  expect(node.getLastChild().getFirstChild().getValue()).toBe(300);
});

test('hasParent works', () => {
  let treeObj = { "root": [100, { 200: [300] }] };
  let node = FlowyTreeNodeConverter.createFromTreeObj(treeObj);
  let entries: FlowyTreeEntriesCollection;
  let tree = new FlowyTree(entries, node);

  expect(node.getValue()).toBeNull();
  expect(node.hasChildren()).toBe(true);
  expect(tree.hasParent(node.getFirstChild().getValue())).toBe(false);
  expect(tree.hasParent(node.getLastChild().getValue())).toBe(false);
  expect(tree.hasParent(node.getLastChild().getFirstChild().getValue())).toBe(true);
});

test('indenting works', () => {
  let treeObj = { "root": [100, 200] };
  let node = FlowyTreeNodeConverter.createFromTreeObj(treeObj);
  let entries: FlowyTreeEntriesCollection;
  let tree = new FlowyTree(entries, node);

  expect(node.getValue()).toBeNull();
  expect(node.hasChildren()).toBe(true);
  expect(node.getFirstChild().getValue()).toBe(100);
  expect(node.getFirstChild().hasChildren()).toBe(false);
  expect(node.getFirstChild().getPrev()).toBeNull();
  expect(node.getFirstChild().getNext().getValue()).toBe(200);
  expect(node.getLastChild().getValue()).toBe(200);
  expect(node.getLastChild().hasChildren()).toBe(false);
  expect(node.getLastChild().getPrev().getValue()).toBe(100);
  expect(node.getLastChild().getNext()).toBeNull();

  let entryId = 200;
  let currNode = tree.getEntryNode(entryId);

  // let prevNode = tree.getPrevSiblingNode(entryId);
  let prevNode = currNode.getPrev();
  currNode.detach();
  prevNode.appendChild(currNode);

  expect(node.getFirstChild().getValue()).toBe(100);
  expect(node.getFirstChild().hasChildren()).toBe(true);
  expect(node.getFirstChild().getPrev()).toBeNull();
  expect(node.getFirstChild().getNext()).toBeNull();
  let gc = node.getFirstChild().getFirstChild();
  expect(gc.getValue()).toBe(200);
  expect(gc.hasChildren()).toBe(false);
  expect(gc.hasPrev()).toBe(false);
  expect(gc.hasNext()).toBe(false);
});

test('dedenting works', () => {
  let treeObj = { "root": [{ 100: [{ 200: [300, 400, 500] }] }] };
  let node = FlowyTreeNodeConverter.createFromTreeObj(treeObj);
  let entries: FlowyTreeEntriesCollection;
  let tree = new FlowyTree(entries, node);

  expect(node.getFirstChild().getValue()).toBe(100);
  expect(node.getFirstChild().getFirstChild().getValue()).toBe(200);
  expect(node.getFirstChild().getFirstChild().getFirstChild().getValue()).toBe(300);
  expect(node.getFirstChild().getFirstChild().getLastChild().getValue()).toBe(500);

  let entryId = 200;
  let currNode = tree.getEntryNode(entryId);
  let parentNode = currNode.getParent();
  currNode.detach();
  parentNode.appendSiblingNode(currNode);

  expect(node.getFirstChild().getValue()).toBe(100);
  expect(node.getLastChild().getValue()).toBe(200);
  expect(node.getLastChild().hasChildren()).toBe(true);
  expect(node.getLastChild().getFirstChild().getValue()).toBe(300);
  expect(node.getLastChild().getLastChild().getValue()).toBe(500);

});


test('changes heading size', () => {
  let treeObj = { "root": [100, 200] };
  let node = FlowyTreeNodeConverter.createFromTreeObj(treeObj);
  let entries: FlowyTreeEntriesCollection = {
    100: {
      text: 'abc'
    },
    200: {
      text: 'def'
    }
  };

  let tree = new FlowyTree(entries, node);

  expect(node.getFirstChild().getValue()).toBe(100);
  expect(node.getLastChild().getValue()).toBe(200);
  let entryId = node.getLastChild().getValue();
  expect(tree.getEntryHeadingSize(entryId)).toBe(0);

  tree.cycleEntryHeadingSize(entryId);
  expect(tree.getEntryHeadingSize(entryId)).toBe(1);

  tree.cycleEntryHeadingSize(entryId);
  expect(tree.getEntryHeadingSize(entryId)).toBe(2);

  tree.cycleEntryHeadingSize(entryId);
  expect(tree.getEntryHeadingSize(entryId)).toBe(3);

  tree.cycleEntryHeadingSize(entryId);
  expect(tree.getEntryHeadingSize(entryId)).toBe(0);

});