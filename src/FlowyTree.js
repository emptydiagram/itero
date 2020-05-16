
export default class FlowyTree {
  constructor(entries) {
    this.entries = entries;
  }

  getEntries() {
    return this.entries;
  }

  getEntry(index) {
    return this.entries[index];
  }

  setEntry(index, value) {
    this.entries[index] = value;
  }

  insertAt(index, newEntry) {
    this.entries.splice(index, 0, newEntry);
  }

  deleteAt(index) {
    this.entries.splice(index, 1);
  }

  size() {
    return this.entries.length;
  }
}
