import { LinkedList, LinkedListItem } from "./LinkedList";

export default class Queue {
  constructor() {
    this.list = new LinkedList();
  }

  add(x) {
    this.list.append(new LinkedListItem(x));
  }

  remove() {
    if (this.list.head) {
      let head = this.list.head.value;
      this.list.head.detach();
      return head;
    }
  }

  isEmpty() {
    return this.list.size === 0;
  }
}