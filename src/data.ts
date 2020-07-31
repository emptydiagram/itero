import { deserializeEntries, serializeEntries } from "./serialization.js";
import type DataStore from "./DataStore.js";
import FlowyTree from "./FlowyTree.js";
import FlowyTreeNode from "./FlowyTreeNode.js";
import { MarkupParser } from "./markup/MarkupParser.js";
import LinkGraph from "./LinkGraph.js";

export interface Document {
  id: string,
  name: string,
  tree: FlowyTree,
  lastUpdated: string
}

export interface DocumentsCollection {
  [id: string]: Document;
}

interface DocIdLookup { [name: string]: string }


export const EntryDisplayState = Object.freeze({
    COLLAPSED: Symbol("Colors.COLLAPSED"),
    EXPANDED: Symbol("Colors.EXPANDED"),
});

export function getNowISO8601() {
  return new Date(Date.now()).toISOString();
}

export function createNewDocument(newDocName: string, initEntryText: string, docs: DocumentsCollection): Document {
  let existingIds = Object.keys(docs).map(id => parseInt(id));
  let newId = (Math.max(...existingIds) + 1).toString();
  let newTree = new FlowyTree(
    { 0: {text: initEntryText} },
    FlowyTreeNode.fromTreeObj({ root: [0] }, null));

  return {
    id: newId,
    name: newDocName,
    lastUpdated: getNowISO8601(),
    tree: newTree,
  };
}


function makeTree(entries, treeObj) {
  let theRoot = FlowyTreeNode.fromTreeObj(treeObj, null);
  return new FlowyTree(entries, theRoot);
}

const LS_KEY = "itero-docs";

export class DataManager {
  dataStore: DataStore;

  constructor(dataStore: DataStore) {
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

  getDocuments(): DocumentsCollection {
    const val = this.dataStore.get(LS_KEY);
    let docs;
    if (val == null) {
      docs = makeInitDocuments();
      this.saveDocuments(docs);
    } else {
      let treeObjDocs = JSON.parse(val);
      let deserDocs = {};
      Object.entries(treeObjDocs).forEach(([entryId, doc]: [string, any]) => {
        let newDoc = {...doc};
        if (!('lastUpdated' in doc)) {
          newDoc.lastUpdated = getNowISO8601();
        }
        newDoc.tree = new FlowyTree(deserializeEntries(doc.tree.entries), FlowyTreeNode.fromTreeObj(doc.tree.node));
        deserDocs[entryId] = newDoc;
      });
      docs = deserDocs;
    }
    return docs;
  }

  // documents: Map<EntryId, Document>
  // where type Document = {id: EntryId, name: String, tree: FlowyTree }
  saveDocuments(documents: DocumentsCollection) {
    let serDocs = {};
    Object.entries(documents).forEach(([entryId, doc]) => {
      serDocs[entryId] = this.documentToSerializationObject(doc);
    });
    let ser = JSON.stringify(serDocs);
    this.dataStore.set(LS_KEY, ser);
    return ser;
  }
}

function makeDocIdLookup(docs: DocumentsCollection): DocIdLookup  {
  // build up index: (doc name) -> (doc id)
  let docIdLookup = {};
  Object.entries(docs).forEach(([docId, doc]: [string, Document]) => {
    docIdLookup[doc.name] = docId;
  });
  return docIdLookup;
}

function makeLinkGraph(docs, docIdLookup) {
  let outAdjacency = {};
  let newDocs = { ...docs };
  Object.entries(docs).forEach(([docId, doc]: [string, Document]) => {
    outAdjacency[docId] = {};
    let currDocEntries = outAdjacency[docId];
    Object.entries(doc.tree.getEntries()).forEach(([entryId, entry]: [string, { text: string }]) => {
      let parseResult = MarkupParser.Text.tryParse(entry.text);
      parseResult.linkedPages.forEach(page => {
        if (!(entryId in currDocEntries)) {
           currDocEntries[entryId] = new Set();
        }
        if (!(page in docIdLookup)) {
          let newDoc = createNewDocument(page, 'TODO', newDocs);
          newDocs[newDoc.id] = newDoc;
        } else {
          outAdjacency[docId][entryId].add(docIdLookup[page]);
        }
      });
    });
  });
  return { linkGraph: new LinkGraph(outAdjacency), documents: newDocs };
}


// Document: = {id: EntryId, name: String, tree: FlowyTree }
export function makeInitContextFromDocuments(docs: DocumentsCollection) {
  let docIdLookup = makeDocIdLookup(docs);
  let { linkGraph, documents } = makeLinkGraph(docs, docIdLookup);

  // for each page:
  //   split name by whitespace
  //   for each word in split result:
  //     add page.id to invInd[word]
  let docNameInvIndex: { [word: string]: string[] } = {};
  Object.entries(documents).forEach(([docId, doc]: [string, Document]) => {
    let splitByWs = doc.name.split(/\s+/);
    splitByWs.forEach(word => {
      if (!(word in docNameInvIndex)) {
        docNameInvIndex[word] = [];
      }
      docNameInvIndex[word].push(docId);
    });
  });

  return {
    documents,
    docIdLookupByDocName: docIdLookup,
    linkGraph,
    docNameInvIndex
  };
}

export function makeDoc(id, name, lastUpdated, entries, root): Document {
  return {
    id: id,
    name: name,
    tree: makeTree(entries, root),
    lastUpdated: lastUpdated || getNowISO8601(),
  };
}

function makeInitDocuments(): DocumentsCollection {
  // 0: { text: 'this is a note taking app', displayState: EntryDisplayState.COLLAPSED },
  let intro = [
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
        16: { text: 'make link to another page: [[implementation details]]' },
        17: { text: 'surround a page name with double square brackets: \\[[page name]]' },
        18: { text: 'make external links in two ways' },
        19: { text: 'just write a URL: https://en.wikipedia.org/wiki/Special:Random' },
        20: { text: 'link name + URL: [random wiki page](https://en.wikipedia.org/wiki/Special:Random)' },
        21: { text: 'type: \\[link name](www.example.com)' },
        22: { text: 'write math symbols (courtesy of MathJax): $1 = \\frac{1}{\\sqrt \\pi} \\int_0^{\\infty} e^{-x^2} dx$'},
        23: { text: 'surround your $\\LaTeX$ with dollar signs' },
        24: { text: '\\$1 = \\frac{1}{\\sqrt \\pi} \\int_0^{\\infty} e^{-x^2} dx\\$'},
        25: { text: 'look, a matrix: $\\begin{bmatrix}\\cos \\theta & -\\sin \\theta\\\\\\sin \\theta & \\cos \\theta\\end{bmatrix}$'}
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
        { 16: [17] },
        { 18: [19, { 20: [21] }] },
        { 22: [{ 23: [24] }, 25] }
      ]}
  ];
  let introLastUpdated ="2020-07-05T19:47:11.000Z";
  let similar = [
    {
      0: { text: 'svelte for components/state' },
      1: { text: 'svelte-spa-router for routing' },
      2: { text: 'parsimmon for the markup language parser/renderer' },
      3: { text: 'mathjax v3 for math display' },
      4: { text: 'font awesome (w/ svelte-awesome) icons' },
      5: { text: 'parser tests using jest' },
    },
    { root: [0, 1, 2, 3, 4, 5] }
  ];
  let similarLastUpdated ="2020-07-05T19:43:44.000Z";
  return {
    '1': makeDoc(1, 'hello and what is this', introLastUpdated, intro[0], intro[1]),
    '2': makeDoc(2, 'implementation details', similarLastUpdated, similar[0], similar[1])
  };
}
