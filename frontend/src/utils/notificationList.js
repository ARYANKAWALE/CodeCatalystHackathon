/**
 * Doubly-linked list node holding one notification payload.
 * Used so we can update/remove by id without scanning the whole array.
 */
export class NotificationNode {
  constructor(item) {
    this.item = item;
    this.prev = null;
    this.next = null;
  }
}

/**
 * Ordered notification list (newest at head), with Map for O(1) id lookup.
 */
export class NotificationLinkedList {
  constructor() {
    this.head = null;
    this.tail = null;
    /** @type {Map<number, NotificationNode>} */
    this._byId = new Map();
  }

  clear() {
    this.head = null;
    this.tail = null;
    this._byId.clear();
  }

  /** @param {object} item */
  unshift(item) {
    const id = item?.id;
    if (id == null) return;
    if (this._byId.has(id)) {
      this.removeById(id);
    }
    const node = new NotificationNode(item);
    this._byId.set(id, node);
    node.next = this.head;
    if (this.head) {
      this.head.prev = node;
    }
    this.head = node;
    if (!this.tail) {
      this.tail = node;
    }
  }

  /**
   * Replace list from API order: first element = newest.
   * @param {object[]} items
   */
  fromServerList(items) {
    this.clear();
    if (!Array.isArray(items)) return;
    for (const item of items) {
      this.unshift(item);
    }
  }

  removeById(id) {
    const node = this._byId.get(id);
    if (!node) return;
    const { prev, next } = node;
    if (prev) {
      prev.next = next;
    } else {
      this.head = next;
    }
    if (next) {
      next.prev = prev;
    } else {
      this.tail = prev;
    }
    this._byId.delete(id);
  }

  /** @param {number} id @param {object} patch */
  updateById(id, patch) {
    const node = this._byId.get(id);
    if (!node) return;
    node.item = { ...node.item, ...patch };
  }

  markAllRead() {
    for (const node of this._byId.values()) {
      node.item = { ...node.item, read: true };
    }
  }

  /** Drop oldest nodes until at most `max` remain. */
  trim(max) {
    if (max < 0) return;
    while (this._byId.size > max && this.tail) {
      this.removeById(this.tail.item.id);
    }
  }

  /** @returns {object[]} Plain array for React render (newest first). */
  toArray() {
    const out = [];
    for (let cur = this.head; cur; cur = cur.next) {
      out.push(cur.item);
    }
    return out;
  }

  get size() {
    return this._byId.size;
  }
}

/**
 * Serializes async work (e.g. PATCH notifications) so rapid clicks don't interleave.
 * Each task runs after the previous finishes (FIFO queue).
 * @returns {(fn: () => Promise<void>) => Promise<void>}
 */
export function createAsyncQueue() {
  let tail = Promise.resolve();
  return function enqueue(task) {
    const run = tail.then(() => task());
    tail = run.catch(() => {});
    return run;
  };
}
