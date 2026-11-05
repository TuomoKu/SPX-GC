'use strict';
class SheetMetrics {
  constructor(now = Date.now) { this.now = now; this.requests = new Map(); }
  record(id) {
    const now = this.now();
    for (const [key, times] of this.requests) {
      const recent = times.filter(time => time > now - 60000);
      if (recent.length) this.requests.set(key, recent); else this.requests.delete(key);
    }
    const times = this.requests.get(id) || [];
    times.push(now);
    this.requests.set(id, times);
  }
  count(url) {
    const id = url?.match(/\/spreadsheets\/d\/([^/]+)/)?.[1] || url;
    return (this.requests.get(id) || []).filter(time => time > this.now() - 60000).length;
  }
}
module.exports = { SheetMetrics };
