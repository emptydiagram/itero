import { deserializeEntries, serializeEntries } from "./serialization.js";
import FlowyTree from "./FlowyTree.js";
import FlowyTreeNode from "./FlowyTreeNode.js";

export const EntryDisplayState = Object.freeze({
    COLLAPSED: Symbol("Colors.COLLAPSED"),
    EXPANDED: Symbol("Colors.EXPANDED"),
});

function makeTree(entries, treeObj) {
  let theRoot = FlowyTreeNode.fromTreeObj(treeObj, null);
  return new FlowyTree(entries, theRoot);
}

const LS_KEY = "itero-docs";

export class DataManager {
  constructor(dataStore) {
    this.dataStore = dataStore;
  }

  treeToSerializationObject(tree) {
    return {
      entries: serializeEntries(tree.getEntries()),
      node: tree.getRoot().toTreeObj()
    };
  }

  documentToSerializationObject(doc) {
    let newDoc = { ...doc };
    newDoc.tree = this.treeToSerializationObject(newDoc.tree);
    return newDoc;
  }

  getDocumentsString() {
    const val = this.dataStore.get(LS_KEY);
    if (val == null) {
      let docs = makeInitDocuments();
      return this.saveDocuments(docs);
    }
    return val;
  }

  getDocuments() {
    const val = this.dataStore.get(LS_KEY);
    let docs;
    if (val == null) {
      docs = makeInitDocuments();
      this.saveDocuments(docs);
    } else {
      let treeObjDocs = JSON.parse(val);
      let deserDocs = {};
      Object.entries(treeObjDocs).forEach(([entryId, doc]) => {
        let newDoc = {...doc};
        newDoc.tree = new FlowyTree(deserializeEntries(doc.tree.entries), FlowyTreeNode.fromTreeObj(doc.tree.node));
        deserDocs[entryId] = newDoc;
      });
      docs = deserDocs;
    }
    return docs;
  }

  // documents: Map<EntryId, Document>
  // where type Document = {id: EntryId, name: String, tree: FlowyTree }
  saveDocuments(documents) {
    let serDocs = {};
    Object.entries(documents).forEach(([entryId, doc]) => {
      serDocs[entryId] = this.documentToSerializationObject(doc);
    });
    let ser = JSON.stringify(serDocs);
    this.dataStore.set(LS_KEY, ser);
    return ser;
  }
}

export function makeInitContextFromDocuments(docs) {
  return {
    currentDocId: null,
    docTitle: '',
    documents: docs,
    displayDocs: Object.keys(docs),
    docCursorEntryId: null,
    docCursorColId: 0,
  };
}

export function makeDoc(id, name, entries, root) {
  return {
    id: id,
    name: name,
    tree: makeTree(entries, root),
  };
}

function makeInitDocuments() {
  // 0: { text: 'this is a note taking app', displayState: EntryDisplayState.COLLAPSED },
  let entries = [
      {
        0: { text: 'this is a note taking app' },
        1: { text: 'you can use it to write a list. ¯\\\\_(ツ)_/¯' },
        2: { text: 'Arrow Up/Down to navigate up/down (😲)' },
        3: { text: 'or clicking on the text with your mouse works too' },
        4: { text: 'actually it\'s a nested list' },
        5: { text: 'you can keep nesting' },
        6: { text: 'items' },
        7: { text: 'and items', displayState: EntryDisplayState.COLLAPSED },
        8: { text: 'a n d i t e m s' },
        9: { text: 'you can collapse parts of the tree. the plus icon (+) indicates a collapsed item' },
        10: { text: '__collapse__: Ctrl + Up' },
        11: { text: '__expand__: Ctrl + Down' },
        12: { text: 'make **bold portions** of the text with double asterisks (\\*\\*), like so:' },
        13: { text: 'my \\**bolded** text' },
        14: { text: 'make __emphasis__ with double underscore:' },
        15: { text: 'my \\__emphasized__ text' },
        16: { text: 'make links in two ways' },
        17: { text: 'just write a URL: https://en.wikipedia.org/wiki/Special:Random' },
        18: { text: 'link name + URL: [random wiki page](https://en.wikipedia.org/wiki/Special:Random)' },
        19: { text: 'type: \\[link name](www.example.com)' },
      },
      { root: [
        0,
        1,
        2,
        3,
        { 4: [
          { 5: [
            { 6: [
              { 7: [8] }
            ]}
          ]},
          { 9: [10, 11] }
        ]},
        { 12: [13] },
        { 14: [15] },
        { 16: [17, { 18: [19]}] }
      ]}
  ];
  return {
    '1': makeDoc(1, 'hello and what is this', entries[0], entries[1])
  };
}
