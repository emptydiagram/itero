import { nodeToTreeObj, treeObjToNode, deserializeEntries, serializeEntries } from "./serialization.js";
import FlowyTree from "./FlowyTree.js";

export const EntryDisplayState = Object.freeze({
    COLLAPSED: Symbol("Colors.COLLAPSED"),
    EXPANDED: Symbol("Colors.EXPANDED"),
});

console.log(EntryDisplayState, EntryDisplayState.COLLAPSED);

function makeTree(entries, treeObj) {
  let theRoot = treeObjToNode(treeObj, null);
  return new FlowyTree(entries, theRoot);
}

export class DataManager {
  constructor(dataStore) {
    this.dataStore = dataStore;
  }

  treeToSerializationObject(tree) {
    return {
      entries: serializeEntries(tree.getEntries()),
      node: nodeToTreeObj(tree.getRoot())
    };
  }

  documentToSerializationObject(doc) {
    let newDoc = { ...doc };
    newDoc.tree = this.treeToSerializationObject(newDoc.tree);
    return newDoc;
  }

  getDocuments() {
    const val = this.dataStore.get("innecto-docs");
    let docs;
    if (val == null) {
      docs = makeInitDocuments();
      this.saveDocuments(docs);
    } else {
      let treeObjDocs = JSON.parse(val);
      let deserDocs = {};
      Object.entries(treeObjDocs).forEach(([entryId, doc]) => {
        let newDoc = {...doc};
        newDoc.tree = new FlowyTree(deserializeEntries(doc.tree.entries), treeObjToNode(doc.tree.node));
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
    this.dataStore.set("innecto-docs", JSON.stringify(serDocs));
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

function makeInitDocuments() {
  let entries = [
    [
      {
        0: { text: 'abc', displayState: EntryDisplayState.COLLAPSED },
        1: { text: 'def' },
        2: { text: 'ghi' },
        3: { text: 'eEe EeE' },
        4: { text: 'Ww Xx Yy Zz' }
      },
      { root: [{ 0: [1, 2] }, 3, 4] }
    ],
    [
      {
        0: { text: '4' },
        1: { text: 'five' },
        2: { text: 'seventy' },
        3: { text: '-1' },
      },
      { root: [2, 0, 3, 1] }
    ],
    [
      {
        0: { text: 'alpha' },
        1: { text: 'beta' },
        2: { text: 'gamma' },
        3: { text: 'delta' },
      },
      {
        root: [
          {
            0: [
              { 1: [2, 3] }
            ]
          }
        ]
      }
    ],
  ];
  return {
    '1': {
      id: 1,
      name: 'some letters',
      tree: makeTree(...entries[0]),
    },
    '2': {
      id: 2,
      name: 'some numbers',
      tree: makeTree(...entries[1]),
    },
    '4': {
      id: 4,
      name: 'some greek letters',
      tree: makeTree(...entries[2]),
    }
  };
}
