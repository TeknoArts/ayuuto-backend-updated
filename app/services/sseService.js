/**
 * SSE (Server-Sent Events) service for real-time group view updates.
 * Maintains in-memory subscribers per shareCode and broadcasts updates.
 */

// Map: shareCode -> Set of response objects (SSE clients)
const subscribers = new Map();

/**
 * Subscribe a client to group updates for a given shareCode.
 * @param {string} shareCode - Group share code
 * @param {import('express').Response} res - Express response (SSE connection)
 */
function subscribe(shareCode, res) {
  if (!shareCode) return;
  const key = shareCode.toUpperCase().trim();
  if (!subscribers.has(key)) {
    subscribers.set(key, new Set());
  }
  subscribers.get(key).add(res);
}

/**
 * Unsubscribe a client (called on disconnect).
 * @param {string} shareCode - Group share code
 * @param {import('express').Response} res - Express response
 */
function unsubscribe(shareCode, res) {
  if (!shareCode) return;
  const key = shareCode.toUpperCase().trim();
  const set = subscribers.get(key);
  if (set) {
    set.delete(res);
    if (set.size === 0) {
      subscribers.delete(key);
    }
  }
}

/**
 * Broadcast updated group data to all subscribers for a shareCode.
 * Pushes an SSE event named "group_update" with JSON payload.
 * @param {string} shareCode - Group share code
 * @param {object} updatedGroup - Public group object (same format as GET /groups/view/:shareCode)
 */
function broadcastGroupUpdate(shareCode, updatedGroup) {
  if (!shareCode || !updatedGroup) return;
  const key = shareCode.toUpperCase().trim();
  const set = subscribers.get(key);
  if (!set || set.size === 0) return;

  const payload = JSON.stringify(updatedGroup);
  const data = `event: group_update\ndata: ${payload}\n\n`;

  set.forEach((res) => {
    try {
      if (!res.writableEnded) {
        res.write(data);
      }
    } catch (err) {
      console.error('[SSE] Error writing to subscriber:', err.message);
      set.delete(res);
    }
  });
}

module.exports = {
  subscribe,
  unsubscribe,
  broadcastGroupUpdate,
};
