'use strict';
(function () {
  const engine = window.OutboundGateEngine;
  if (!engine || typeof engine.evaluateSendGates !== 'function' || typeof engine.validateDraft !== 'function') {
    const details = document.getElementById('verdict-detail');
    details.textContent = 'The policy engine failed to load. Do not rely on this display.';
    document.getElementById('verdict').textContent = 'UNAVAILABLE';
    return;
  }

  const byId = (id) => document.getElementById(id);
  const toggleIds = ['evidence', 'route', 'claims', 'duplicate', 'commercial',
    'deliverability', 'rate', 'cap', 'authorization', 'hash'];
  const PRESETS = Object.freeze({
    pass: { buyer: 'READY', mailbox: 'valid' },
    mailbox: { buyer: 'READY', mailbox: 'unknown' },
    claims: { buyer: 'READY', mailbox: 'valid', claims: false },
    approval: { buyer: 'READY', mailbox: 'valid', authorization: false },
    duplicate: { buyer: 'READY', mailbox: 'valid', duplicate: true }
  });

  function getState() {
    const state = { buyer: byId('buyer').value, mailbox: byId('mailbox').value };
    for (const id of toggleIds) state[id] = byId(id).checked;
    return state;
  }

  function setPreset(name) {
    const preset = PRESETS[name];
    if (!preset) return;
    byId('buyer').value = preset.buyer;
    byId('mailbox').value = preset.mailbox;
    for (const id of toggleIds) byId(id).checked = id === 'duplicate' ? false : true;
    for (const [id, value] of Object.entries(preset)) {
      if (toggleIds.includes(id)) byId(id).checked = value;
    }
    for (const button of document.querySelectorAll('[data-preset]')) {
      const active = button.getAttribute('data-preset') === name;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
    evaluate();
  }

  function buildContext(state) {
    // This browser never obtains a real authorization or mailbox-verification result.
    // Booleans below are synthetic *inputs* to the real gate engine, not real-world checks.
    const claim = 'Example company publishes a receptionist product';
    const draft = {
      recipient: 'owner@northstar.example',
      subject: 'An example idea',
      text: 'I noticed your receptionist product.',
      html: '',
      claims: [claim]
    };
    const preflight = engine.validateDraft(draft, state.claims ?
      [{ claim, status: 'VERIFIED' }] : []);
    return {
      buyer: { state: state.buyer },
      evidence: { verified: state.evidence, fresh: state.evidence, attributable: state.evidence },
      contact_route: { suitable: state.route },
      mailbox_verification: { status: state.mailbox, provider: 'synthetic' },
      duplicate: { duplicate: state.duplicate, kind: 'organization' },
      personalization: { supported: preflight.ok },
      preflight,
      commercial_review: { ok: state.commercial },
      operational: { deliverability_ok: state.deliverability, rate_ok: state.rate, cap_ok: state.cap },
      authorization: { approved: state.authorization },
      approval: { matches: state.hash }
    };
  }

  function renderGates(gates) {
    const list = byId('gate-list');
    list.replaceChildren();
    for (const gate of gates) {
      const li = document.createElement('li');
      const detail = document.createElement('div');
      const title = document.createElement('div');
      const reason = document.createElement('div');
      const status = document.createElement('span');

      li.className = 'gate ' + gate.result.toLowerCase();
      title.className = 'gate-name';
      title.textContent = gate.name.replace(/_/g, ' ');
      reason.className = 'gate-reason';
      reason.textContent = gate.reason;
      status.className = 'gate-indicator';
      status.textContent = gate.result;
      detail.append(title, reason);
      li.append(detail, status);
      list.appendChild(li);
    }
  }

  function evaluate() {
    const context = buildContext(getState());
    const outcome = engine.evaluateSendGates(context);
    const nonPassing = outcome.gates.filter((gate) => gate.result !== 'PASS');
    const badge = byId('verdict');
    badge.className = 'verdict ' + outcome.decision.toLowerCase();
    badge.textContent = outcome.decision;
    byId('total').textContent = String(outcome.gates.length);
    byId('blocked-count').textContent = String(nonPassing.length);
    byId('verdict-detail').textContent = nonPassing.length === 0 ?
      'All synthetic conditions pass. Simulation only: zero emails are sent.' :
      nonPassing.map((item) => item.name.replace(/_/g, ' ') + ': ' + item.result).join(' · ');
    renderGates(outcome.gates);
  }

  for (const button of document.querySelectorAll('[data-preset]')) {
    button.addEventListener('click', () => setPreset(button.getAttribute('data-preset')));
  }

  for (const id of ['buyer', 'mailbox', ...toggleIds]) {
    byId(id).addEventListener('change', () => {
      for (const button of document.querySelectorAll('[data-preset]')) {
        button.classList.remove('active');
        button.setAttribute('aria-pressed', 'false');
      }
      evaluate();
    });
  }

  setPreset('pass');
})();
