export default class BinaryHeap {
    /**
     * BinaryHeap implementation with ability to recalculate positions on score updates.
     *
     * @param costfun function returning cell traversal cost from heuristic
     */
    constructor(costfun) {
        Rush.debug(0, 'New Binary Heap');
        this.costfun = costfun;
        this.__heap = [];
    }

    /**
     * Add new element to the heap and sink it down the tree.
     * @param element Element to add
     */
    push(element) {
        if (this.__heap.indexOf(element) >= 0) return;
        this.__heap.push(element);
        this.sinkDown(this.__heap.length - 1);
    }

    /**
     * Remove and return lowest scoring element
     * @returns {*}
     */
    pop() {
        const first = this.__heap[0];
        const last = this.__heap.pop();
        if (this.__heap.length > 0) {
            this.__heap[0] = last;
            this.bubbleUp(0);
        }
        return first;
    }

    /**
     * Remove a node element from the heap.
     * @param node
     */
    remove(node) {
        let index = this.__heap.indexOf(node);
        if (index < 0) {
            console.error('Rush | Node to be removed not in heap. Skipping.');
            return;
        }
        const end = this.__heap.pop();

        if (index !== this.__heap.length) {  // in original implementation was `this.__heap.length - 1
            this.__heap[index] = end;
            if (this.costfun(end) < this.costfun(node)) {
                this.sinkDown(index);
            } else {
                this.bubbleUp(index);
            }
        }
    }

    /**
     * Number of elements in the heap.
     * @returns {number}
     */
    get size (){
        return this.__heap.length;
    }

    /**
     * Sink node down if score has changed. As we only ever increase a node score when searching the traversal
     * space, we do not need to check for direction sign and assume it'll sink.
     * @param node
     */
    rethink(node) {
        this.sinkDown(this.__heap.indexOf(node));
    }

    /**
     * Move element at index down in the tree until a parent with lower score is obtained.
     * @param index Index of the element in the heap
     */
    sinkDown(index) {
        const element = this.__heap[index];
        while (index > 0) {
            const parentN = ((index + 1) >> 1) - 1;
            const parent = this.__heap[parentN];

            // Found a parent that is less, no need to sink any further.
            if (this.costfun(parent) < this.costfun(element)) break;

            this.__heap[parentN] = element;
            this.__heap[index] = parent;
            index = parentN;
        }
    }

    /**
     * Rise element at index up until parent found with lower score.
     * @param index Index of the element in the heap
     */
    bubbleUp(index) {
        const length = this.__heap.length;
        const element = this.__heap[index];
        const elementScore = this.costfun(element);

        // todo: is here potential for an optimization where we do not check the (widest) last level in the tree?
        // i.e. ignore the second half? Or does that only work in maxheap? Why would it?
        while (true) {
            const idxRight = (index + 1) << 1;
            const idxLeft = idxRight - 1;
            let swap = null;

            // If the left leaf exists (is inside the array)
            if (idxLeft < length) {
                const leftElement = this.__heap[idxLeft];
                const leftScore = this.costfun(leftElement);

                if (leftScore < elementScore) swap = idxLeft;
            }

            // Same with right leaf
            if (idxRight < length) {
                const rightElement = this.__heap[idxRight];
                const rightScore = this.costfun(rightElement);

                if (rightScore < elementScore) swap = idxRight;
            }

            if (swap !== null) {
                this.__heap[index] = this.__heap[swap];
                this.__heap[swap] = element;
                index = swap;
            } else {
                break;
            }
        }
    }
}