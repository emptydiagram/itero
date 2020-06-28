export default class LinkGraph {
  // outAdjacency: { [doc id]: { [entry id]: Set<doc id> } }
  constructor(outAdjacency) {
    this.outAdjacency = outAdjacency;
    // inAdjacency: { [doc id]: Set<[doc id, entry id]> }
    // actually Set doesnt play well with arrays for our use case
    // so instead we store strings made by concat(docId, '-', entryId)
    let inAdjacency = {};
    Object.entries(outAdjacency).forEach(([docId, entries]) => {
      Object.entries(entries).forEach(([entryId, entryLinks]) => {
        for (let [id, _] of entryLinks.entries()) {
          if (!(id in inAdjacency)) {
              inAdjacency[id] = new Set();
          }
          inAdjacency[id].add(this.convertToInAdjElement(docId, entryId));
        }
      });
    });
    console.log(" %^#^ LinkGraph, inAdjacency = ", inAdjacency);
    this.inAdjacency = inAdjacency;
  }

    convertToInAdjElement(docId, entryId) {
      return `${docId}-${entryId}`;
    }

    convertFromInAdjElement(s) {
      let parsed = s.split('-');
      return [parseInt(parsed[0]), parseInt(parsed[1])];
    }

    getBacklinks(docId) {
      if (!(docId in this.inAdjacency)) {
        return new Set();
      }
      let linksTo = this.inAdjacency[docId];
      return new Set([...linksTo].map(elem => this.convertFromInAdjElement(elem)));
    }

    // return: Set<doc id>
    getLinks(docId, entryId) {
      if (!(docId in this.outAdjacency) || !(entryId in this.outAdjacency[docId])) {
          return new Set();
      }
      return this.outAdjacency[docId][entryId];
    }

    removeLink(docIdFrom, entryId, docIdTo) {
      this.outAdjacency[docIdFrom][entryId].delete(docIdTo);
      this.inAdjacency[docIdTo].delete(this.convertToInAdjElement(docIdFrom, entryId));
    }

    addLink(docIdFrom, entryId, docIdTo) {
      if (!(entryId in this.outAdjacency[docIdFrom])) {
        this.outAdjacency[docIdFrom][entryId] = new Set();
      }
      if (!(docIdTo in this.inAdjacency)) {
        this.inAdjacency[docIdTo] = new Set();
      }
      this.outAdjacency[docIdFrom][entryId].add(docIdTo);
      this.inAdjacency[docIdTo].add(this.convertToInAdjElement(docIdFrom, entryId));
    }
}