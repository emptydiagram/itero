import { LinkedListItem } from "./LinkedList.js";
import FlowyTreeNode from './FlowyTreeNode.js'

export default class FlowyTree {
  // entries: Map<EntryId, String>
  // entriesList: LinkedList<EntryId>
  constructor(entries, entriesList) {
    this.entries = entries;
    // this.entriesList = entriesList;
    this.root = new FlowyTreeNode(null, null, entriesList);
  }

  getEntries() {
    return this.entries;
  }

  getEntriesList() {
    return this.root.getChildren();
  }

  getEntryTexts() {
    return this.root.getChildren().toArray().map(item => this.entries[item.value])
  }

  getEntry(index) {
    let entryId = this.root.getChildren().get(index).value;
    return this.entries[entryId];
  }

  setEntry(index, value) {
    let entryId = this.root.getChildren().get(index).value;
    this.entries[entryId] = value;
  }

  insertAt(index, newEntry) {
    let n = this.root.getChildren().size;
    if (index > n) {
      throw `insertAt: index ${index} is too large, there are only ${n} items`
    }

    let existingIds = Object.keys(this.entries).map(id => parseInt(id));
    let newId = Math.max(...existingIds) + 1;
    this.entries[newId] = newEntry;

    let newNode = new LinkedListItem(newId);
    let prevNode = this.root.getChildren().get(index - 1);
    prevNode.append(newNode);
  }

  deleteAt(index) {
    let node = this.root.getChildren().get(index);
    delete this.entries[node.value];
    node.detach();
  }

  size() {
    return this.entries.length;
  }
}
