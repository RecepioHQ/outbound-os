'use strict';
(function (root) {
  // Only synthetic fixture states are serializable. No real addresses, secrets
  // or mailbox data are ever included in the URL.
  const FIELDS = Object.freeze(['evidence', 'route', 'claims', 'duplicate',
    'commercial', 'deliverability', 'rate', 'cap', 'authorization', 'hash']);
  const BUYERS = Object.freeze(['READY', 'HOLD', 'SKIP']);
  const MAILBOXES = Object.freeze(['valid', 'unknown', 'catch_all', 'invalid', 'error']);
  const KEYS = Object.freeze(['buyer', 'mailbox', ...FIELDS]);

  function encode(state) {
    if (!BUYERS.includes(state.buyer) || !MAILBOXES.includes(state.mailbox)) {
      throw new Error('Invalid synthetic scenario values');
    }
    const values = new URLSearchParams();
    values.set('buyer', state.buyer);
    values.set('mailbox', state.mailbox);
    for (const name of FIELDS) {
      if (typeof state[name] !== 'boolean') throw new Error('Invalid scenario flag: ' + name);
      values.set(name, state[name] ? '1' : '0');
    }
    return '#' + values.toString();
  }

  function decode(rawHash) {
    if (typeof rawHash !== 'string' || rawHash.length > 512 ||
        !rawHash.startsWith('#buyer=')) return null;
    const values = new URLSearchParams(rawHash.slice(1));
    const keys = [...values.keys()];
    if (keys.length !== KEYS.length || keys.some((name) => !KEYS.includes(name)) ||
        KEYS.some((name) => values.getAll(name).length !== 1)) return null;
    const buyer = values.get('buyer');
    const mailbox = values.get('mailbox');
    if (!BUYERS.includes(buyer) || !MAILBOXES.includes(mailbox)) return null;
    const state = { buyer, mailbox };
    for (const name of FIELDS) {
      const value = values.get(name);
      if (value !== '1' && value !== '0') return null;
      state[name] = value === '1';
    }
    return state;
  }

  root.OutboundScenarioCodec = Object.freeze({ encode, decode });
})(window);
