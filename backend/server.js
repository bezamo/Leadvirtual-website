'use strict';
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();

const {
  ASANA_PAT,
  ASANA_PROJECT_GID,
  ASANA_SECTION_NEW_LEADS_GID,
  ASANA_SECTION_SCRIPT_REQUESTS_GID,
  ASANA_ASSIGNEE_1_GID,
  ASANA_ASSIGNEE_2_GID,
  ALLOWED_ORIGIN = '*',
  PORT = 3000,
} = process.env;

// Warn on startup if required variables are missing
['ASANA_PAT', 'ASANA_PROJECT_GID', 'ASANA_SECTION_NEW_LEADS_GID', 'ASANA_SECTION_SCRIPT_REQUESTS_GID'].forEach((k) => {
  if (!process.env[k]) console.warn(`[warn] Missing env var: ${k}`);
});

const allowedOrigins = ALLOWED_ORIGIN === '*' ? '*' : ALLOWED_ORIGIN.split(',').map((s) => s.trim());
app.use(cors({ origin: allowedOrigins, methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type'] }));
app.use(express.json({ limit: '16kb' }));

// ── Asana API ─────────────────────────────────────────────────────────────
const ASANA_BASE = 'https://app.asana.com/api/1.0';

async function asanaPost(path, body) {
  const res = await fetch(`${ASANA_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ASANA_PAT}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json.errors?.[0]?.message || res.statusText;
    throw Object.assign(new Error(`Asana ${path} → ${res.status}: ${msg}`), { asanaResponse: json });
  }
  return json;
}

async function createAndPlaceTask(name, notes, sectionGid) {
  const assignees = [ASANA_ASSIGNEE_1_GID, ASANA_ASSIGNEE_2_GID].filter(Boolean);
  const { data } = await asanaPost('/tasks', {
    data: {
      name,
      notes,
      projects: [ASANA_PROJECT_GID],
      assignee: assignees[0] || null,
      followers: assignees,
    },
  });
  await asanaPost(`/sections/${sectionGid}/addTask`, { data: { task: data.gid } });
  return data.gid;
}

function buildNotes(fields) {
  return Object.entries(fields)
    .filter(([, v]) => v && String(v).trim())
    .map(([k, v]) => `${k}: ${String(v).trim()}`)
    .join('\n');
}

// ── POST /api/contact ─────────────────────────────────────────────────────
// Handles: Contact Us form, Get Started modal (all service pages + home)
app.post('/api/contact', async (req, res) => {
  const { name, email, phone, company, service, message, source } = req.body || {};
  try {
    const taskName = `${source || 'Contact Form'} - ${name || email || 'Unknown'}`;
    const notes = buildNotes({
      Source: source,
      Name: name,
      Email: email,
      Phone: phone,
      Company: company,
      Service: service,
      Message: message,
    });
    const gid = await createAndPlaceTask(taskName, notes, ASANA_SECTION_NEW_LEADS_GID);
    console.log(`[contact] Task ${gid} created for "${email}" (${source})`);
    res.json({ ok: true });
  } catch (err) {
    console.error('[contact] Error:', err.message);
    res.status(500).json({ ok: false });
  }
});

// ── POST /api/script-request ──────────────────────────────────────────────
// Handles: "Send me a script" modal on the Real Estate VA page
app.post('/api/script-request', async (req, res) => {
  const { email } = req.body || {};
  try {
    const taskName = `Script Request - ${email || 'Unknown'}`;
    const notes = buildNotes({ Email: email });
    const gid = await createAndPlaceTask(taskName, notes, ASANA_SECTION_SCRIPT_REQUESTS_GID);
    console.log(`[script-request] Task ${gid} created for "${email}"`);
    res.json({ ok: true });
  } catch (err) {
    console.error('[script-request] Error:', err.message);
    res.status(500).json({ ok: false });
  }
});

// ── Health check ──────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ ok: true, ts: new Date().toISOString() }));

app.listen(PORT, () => console.log(`LeadVirtual backend listening on :${PORT}`));
