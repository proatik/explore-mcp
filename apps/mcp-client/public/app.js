'use strict';

// the page only renders; the agent, keys and approval rules stay on the server.
const log = document.getElementById('log');
const form = document.getElementById('composer');
const input = document.getElementById('input');
const send = document.getElementById('send');
const statusLine = document.getElementById('status');
const banner = document.getElementById('banner');
const toolList = document.getElementById('tools');
const approvalTemplate = document.getElementById('approval-template');

const APPROVAL_LABELS = {
  auto: 'auto',
  confirm: 'asks',
  explicit: 'type to confirm',
  deny: 'blocked'
};

let sessionId = null;
let isBusy = false;

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers }
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok)
    throw new Error(body.message || `Request failed (${response.status}).`);

  return body;
}

function append(element) {
  log.querySelector('.welcome')?.remove();
  log.append(element);
  log.scrollTop = log.scrollHeight;

  return element;
}

function addMessage(role, text) {
  const item = document.createElement('li');

  item.className = `message ${role}`;
  item.textContent = text;

  return append(item);
}

function addStep(parts) {
  const item = document.createElement('li');

  item.className = 'step';

  for (const part of parts) {
    const span = document.createElement('span');

    span.textContent = part.text;

    if (part.className) span.className = part.className;

    item.append(span);
  }

  return append(item);
}

function setBusy(value) {
  isBusy = value;
  send.disabled = value;
  input.disabled = value;
  send.textContent = value ? 'Working…' : 'Send';

  if (!value) input.focus();
}

function shortJson(value) {
  const text = JSON.stringify(value);

  return text.length > 140 ? `${text.slice(0, 140)}…` : text;
}

function addApproval(event) {
  const card = approvalTemplate.content.firstElementChild.cloneNode(true);
  const isExplicit = event.level === 'explicit';
  const approveButton = card.querySelector('.approve');
  const declineButton = card.querySelector('.decline');
  const confirm = card.querySelector('.approval-confirm');
  const args = card.querySelector('.approval-args');

  card.classList.toggle('explicit', isExplicit);
  card.querySelector('.approval-head').textContent = isExplicit
    ? `Destructive: ${event.tool} on ${event.server}`
    : `Approve ${event.tool} on ${event.server}?`;

  for (const [key, value] of Object.entries(event.args)) {
    const term = document.createElement('dt');
    const detail = document.createElement('dd');

    term.textContent = key;
    detail.textContent = JSON.stringify(value);
    args.append(term, detail);
  }

  if (isExplicit) {
    const field = confirm.querySelector('input');

    confirm.hidden = false;
    confirm.querySelector('span').textContent =
      `Type ${event.tool} to enable Approve.`;
    approveButton.disabled = true;
    field.addEventListener('input', () => {
      approveButton.disabled = field.value.trim() !== event.tool;
    });
  }

  const answer = async (isApproved) => {
    approveButton.disabled = true;
    declineButton.disabled = true;

    try {
      const result = await api(
        `/api/sessions/${sessionId}/approvals/${event.approvalId}`,
        {
          method: 'POST',
          body: JSON.stringify({ isApproved })
        }
      );

      card.querySelector('.approval-actions').replaceWith(
        Object.assign(document.createElement('div'), {
          className: 'outcome',
          textContent: result.message
        })
      );
    } catch (error) {
      addMessage('error', error.message);
    }
  };

  approveButton.addEventListener('click', () => void answer(true));
  declineButton.addEventListener('click', () => void answer(false));

  append(card);
}

function handleEvent(event) {
  switch (event.type) {
    case 'run_started':
      setBusy(true);
      break;
    case 'run_finished':
      setBusy(false);
      break;
    case 'tool_call':
      addStep([{ text: `→ ${event.name} ${shortJson(event.args)}` }]);
      break;
    case 'progress':
      addStep([
        {
          text: `  … ${event.message || `${event.progress}/${event.total ?? '?'}`}`
        }
      ]);
      break;
    case 'tool_result':
      addStep([
        { text: `← ${event.name} ` },
        event.isError
          ? { text: event.errorCode || 'error', className: 'bad' }
          : { text: 'ok', className: 'ok' },
        { text: ` ${event.durationMs}ms` }
      ]);
      break;
    case 'approval_required':
      addApproval(event);
      break;
    case 'final':
      addMessage('agent', event.text);
      break;
    case 'error':
      addMessage('error', event.message);
      break;
    default:
      break;
  }
}

async function loadStatus() {
  try {
    const status = await api('/api/status');
    const connected = status.servers.filter(
      (server) => server.state === 'connected'
    );

    statusLine.replaceChildren();

    for (const server of status.servers) {
      const dot = document.createElement('span');

      dot.className = `dot ${server.state === 'connected' ? 'on' : ''}`;
      statusLine.append(dot, `${server.name} · ${server.tools} tools   `);
    }

    statusLine.append(status.model ? `model ${status.model}` : 'no model');

    banner.hidden = Boolean(status.model) && connected.length > 0;
    banner.textContent = !status.model
      ? 'No language model configured. Add OPENAI_API_KEY to .env and restart the client to chat. Tools are still listed.'
      : 'No MCP server is connected. Start the server, then press Reconnect servers.';

    toolList.replaceChildren(
      ...status.tools.map((tool) => {
        const item = document.createElement('li');
        const name = document.createElement('span');
        const badge = document.createElement('span');

        name.textContent = tool.name;
        name.title = tool.title;
        badge.className = `badge ${tool.approval}`;
        badge.textContent = APPROVAL_LABELS[tool.approval] || tool.approval;
        item.append(name, badge);

        return item;
      })
    );
  } catch (error) {
    statusLine.textContent = error.message;
  }
}

async function start() {
  const session = await api('/api/sessions', { method: 'POST' });
  const events = new EventSource(`/api/sessions/${session.sessionId}/events`);

  sessionId = session.sessionId;
  events.onmessage = (message) => handleEvent(JSON.parse(message.data));

  await loadStatus();
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const text = input.value.trim();

  if (!text || isBusy) return;

  input.value = '';
  addMessage('user', text);

  try {
    await api(`/api/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text })
    });
  } catch (error) {
    addMessage('error', error.message);
  }
});

input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

document.getElementById('suggestions').addEventListener('click', (event) => {
  if (event.target instanceof HTMLButtonElement) {
    input.value = event.target.textContent;
    form.requestSubmit();
  }
});

document.getElementById('refresh').addEventListener('click', async () => {
  await api('/api/status/refresh', { method: 'POST' }).catch((error) =>
    addMessage('error', error.message)
  );
  await loadStatus();
});

void start();
