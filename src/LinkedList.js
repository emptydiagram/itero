import List from 'linked-list';
import inherits from 'inherits';

inherits(LinkedList, List);
inherits(LinkedListItem, List.Item);

LinkedList.Item = LinkedListItem;

export function LinkedList() {
    console.log(" ++ LinkedList, arguments = ", arguments)
    List.apply(this, arguments);
}

LinkedList.prototype.get = function(n) {
    // TODO: error checking
    let curr = this.head;
    for (var i = 0; i < n; ++i) {
        curr = curr.next;
    }
    return curr;
};

export function LinkedListItem(value) {
    this.value = value;
    List.Item.apply(this, arguments);
}
