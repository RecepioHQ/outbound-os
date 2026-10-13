class MockMailboxAdapter {
  constructor(events = []) {
    this.events = Array.isArray(events) ? events.slice() : [];
  }

  async listEvents(cursor = 0) {
    const start = Number.isInteger(Number(cursor)) ? Number(cursor) : 0;
    return { events: this.events.slice(start), cursor: this.events.length };
  }

  async getMessage(id) {
    return this.events.find((event) => event.provider_event_id === id || event.event_id === id) || null;
  }
}

module.exports = { MockMailboxAdapter };
