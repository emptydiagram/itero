import { LinkedListItem } from "./LinkedList";

export default class FlowyTree {
  // entries: Map<EntryId, String>
  // entriesList: LinkedList
  constructor(entries, entriesList) {
    this.entries = entries;
    this.entriesList = entriesList;
  }

  getEntries() {
    return this.entries;
  }

  getEntriesList() {
    return this.entriesList;
  }

  getEntryTexts() {
    return this.entriesList.toArray().map(item => this.entries[item.value])
  }

  getEntry(index) {
    let entryId = this.entriesList.get(index).value;
    return this.entries[entryId];
  }

  setEntry(index, value) {
    let entryId = this.entriesList.get(index).value;
    this.entries[entryId] = value;
  }

  insertAt(index, newEntry) {
    let n = this.entriesList.size;
    if (index > n) {
      throw `insertAt: index ${index} is too large, there are only ${n} items`
    }

    let existingIds = Object.keys(this.entries).map(id => parseInt(id));
    let newId = Math.max(...existingIds) + 1;
    this.entries[newId] = newEntry;

    let newNode = new LinkedListItem(newId);
    let prevNode = this.entriesList.get(index - 1);
    prevNode.append(newNode);
  }

  deleteAt(index) {
    let node = this.entriesList.get(index);
    delete this.entries[node.value];
    node.detach();
  }

  size() {
    return this.entries.length;
  }
}
