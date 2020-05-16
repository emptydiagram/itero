export default class FlowyTree {
  // root: FlowyTreeNode
  constructor(entriesList, root) {
    this.entriesList = entriesList;
    this.root = root;
  }

  getEntries() {
    return this.entriesList;
  }

  getRoot() {
    return this.root;
  }

  getEntry(index) {
    return this.entriesList[index];
  }

  setEntry(index, value) {
    this.entriesList[index] = value;
  }

  insertAt(index, newEntry) {
    this.entriesList.splice(index, 0, newEntry);
  }

  deleteAt(index) {
    this.entriesList.splice(index, 1);
  }

  size() {
    return this.entriesList.length;
  }
}
