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

/** Priority tiers (lower number = higher priority). */
const KIND_PRIORITY = {
  appeal_submitted: 0,
  appeal_accepted: 1,
  appeal_rejected: 1,
  placement_status: 2,
  placement_created: 2,
  internship_status: 3,
  internship_created: 3,
  general: 4,
};

function priorityOf(kind) {
  return KIND_PRIORITY[(kind || '').toLowerCase()] ?? 5;
}

/**
 * Ordered notification list (newest at head), with Map for O(1) id lookup.
 * Implements DSA concepts: doubly-linked list with priority insertion,
 * dequeue, grouping, and efficient traversal.
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

  /** @param {object} item — prepend to head (standard newest-first) */
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
   * Priority-aware insertion: inserts among unread items sorted by kind priority.
   * Appeal notifications surface before general ones.
   * @param {object} item
   */
  insertByPriority(item) {
    const id = item?.id;
    if (id == null) return;
    if (this._byId.has(id)) {
      this.removeById(id);
    }
    const prio = priorityOf(item.kind);
    const node = new NotificationNode(item);
    this._byId.set(id, node);

    // Walk from head and find the first node with lower priority (higher number)
    // among unread items. Insert before it.
    let cur = this.head;
    while (cur) {
      const curPrio = priorityOf(cur.item.kind);
      if (!cur.item.read && curPrio > prio) {
        // Insert before cur
        node.next = cur;
        node.prev = cur.prev;
        if (cur.prev) {
          cur.prev.next = node;
        } else {
          this.head = node;
        }
        cur.prev = node;
        return;
      }
      cur = cur.next;
    }
    // Append to tail (lowest priority or all items examined)
    node.prev = this.tail;
    if (this.tail) {
      this.tail.next = node;
    }
    this.tail = node;
    if (!this.head) {
      this.head = node;
    }
  }

  /**
   * Replace list from API order: first element = newest.
   * @param {object[]} items
   */
  fromServerList(items) {
    this.clear();
    if (!Array.isArray(items)) return;
    // Server sends newest-first, so iterate in reverse to build newest-at-head
    for (let i = items.length - 1; i >= 0; i--) {
      this.unshift(items[i]);
    }
  }

  removeById(id) {
    const node = this._byId.get(id);
    if (!node) return null;
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
    return node.item;
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

  /** Drop oldest nodes until at most `max` remain. Uses dequeueOldest. */
  trim(max) {
    if (max < 0) return;
    while (this._byId.size > max && this.tail) {
      this.dequeueOldest();
    }
  }

  // ── Queue / Deque operations ───────────────────────────────────────────

  /**
   * Dequeue (remove + return) the oldest notification (tail of list).
   * Implements queue FIFO dequeue from the back.
   * @returns {object|null}
   */
  dequeueOldest() {
    if (!this.tail) return null;
    return this.removeById(this.tail.item.id);
  }

  /**
   * Peek at the newest notification without removing it.
   * @returns {object|null}
   */
  peekNewest() {
    return this.head?.item ?? null;
  }

  /**
   * Peek at the oldest notification without removing it.
   * @returns {object|null}
   */
  peekOldest() {
    return this.tail?.item ?? null;
  }

  // ── Traversal helpers ──────────────────────────────────────────────────

  /**
   * Count unread by traversing the linked list.
   * @returns {number}
   */
  get unreadCount() {
    let count = 0;
    for (let cur = this.head; cur; cur = cur.next) {
      if (!cur.item.read) count++;
    }
    return count;
  }

  /**
   * Return only unread items (traverses list, returns plain array).
   * @returns {object[]}
   */
  filterUnread() {
    const out = [];
    for (let cur = this.head; cur; cur = cur.next) {
      if (!cur.item.read) out.push(cur.item);
    }
    return out;
  }

  /**
   * Group notifications by `kind` field. Returns { kind: count }.
   * Traverses the linked list once — O(n).
   * @param {boolean} unreadOnly — if true, count only unread items
   * @returns {Record<string, number>}
   */
  groupByKind(unreadOnly = false) {
    const groups = {};
    for (let cur = this.head; cur; cur = cur.next) {
      if (unreadOnly && cur.item.read) continue;
      const k = cur.item.kind || 'general';
      groups[k] = (groups[k] || 0) + 1;
    }
    return groups;
  }

  /**
   * Get items filtered by kind.
   * @param {string} kind
   * @returns {object[]}
   */
  filterByKind(kind) {
    const out = [];
    for (let cur = this.head; cur; cur = cur.next) {
      if (cur.item.kind === kind) out.push(cur.item);
    }
    return out;
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

  /**
   * Check if a notification id exists in constant time.
   * @param {number} id
   * @returns {boolean}
   */
  has(id) {
    return this._byId.has(id);
  }
}

/**
 * Serializes async work (e.g. PATCH notifications) so rapid clicks don't interleave.
 * Each task runs after the previous finishes (FIFO queue).
 * Implements a promise-based task queue — classic DSA queue pattern for async ops.
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
