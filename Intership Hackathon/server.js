const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Data directory
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper: read JSON file
function readJSON(filename) {
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) {
    return null;
  }
  const raw = fs.readFileSync(filepath, 'utf-8');
  return JSON.parse(raw);
}

// Helper: write JSON file
function writeJSON(filename, data) {
  const filepath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
}

// Helper: ensure splits.json exists
function getSplits() {
  const data = readJSON('splits.json');
  return data || [];
}

function saveSplits(splits) {
  writeJSON('splits.json', splits);
}

// Helper: ensure history.json exists
function getHistory() {
  const data = readJSON('history.json');
  return data || [];
}

function saveHistory(history) {
  writeJSON('history.json', history);
}

// ============ API ROUTES ============

// GET /api/splits - List all splits
app.get('/api/splits', (req, res) => {
  const splits = getSplits();
  res.json(splits);
});

// POST /api/splits - Create a new split
app.post('/api/splits', (req, res) => {
  const { groupName, hostName, paymentQR } = req.body;

  if (!groupName || !hostName) {
    return res.status(400).json({ error: 'groupName and hostName are required' });
  }

  const splitId = uuidv4().slice(0, 8);
  const code = groupName.replace(/\s+/g, '') + splitId.slice(0, 4).toUpperCase();

  const newSplit = {
    id: splitId,
    code: code,
    groupName: groupName,
    host: hostName,
    createdAt: new Date().toISOString(),
    status: 'active',
    members: [
      {
        name: hostName,
        color: 'bg-pink-500',
        initial: hostName.charAt(0).toUpperCase(),
        paid: false,
        isHost: true
      }
    ],
    items: [],
    paymentQR: paymentQR || {
      provider: 'duitnow',
      accountName: '',
      preview: null
    },
    splitMode: 'equal',
    receiptFile: null
  };

  const splits = getSplits();
  splits.push(newSplit);
  saveSplits(splits);

  res.status(201).json(newSplit);
});

// GET /api/splits/:id - Get a specific split
app.get('/api/splits/:id', (req, res) => {
  const splits = getSplits();
  const split = splits.find(s => s.id === req.params.id || s.code === req.params.id);
  if (!split) {
    return res.status(404).json({ error: 'Split not found' });
  }
  res.json(split);
});

// PUT /api/splits/:id - Update a split
app.put('/api/splits/:id', (req, res) => {
  const splits = getSplits();
  const index = splits.findIndex(s => s.id === req.params.id || s.code === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Split not found' });
  }

  splits[index] = { ...splits[index], ...req.body, id: splits[index].id, code: splits[index].code };
  saveSplits(splits);
  res.json(splits[index]);
});

// DELETE /api/splits/:id - Delete a split
app.delete('/api/splits/:id', (req, res) => {
  let splits = getSplits();
  const index = splits.findIndex(s => s.id === req.params.id || s.code === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Split not found' });
  }

  const removed = splits.splice(index, 1)[0];
  saveSplits(splits);

  // Add to history
  const history = getHistory();
  history.push({
    id: removed.id,
    name: removed.groupName,
    date: removed.createdAt.split('T')[0],
    completedAt: new Date().toISOString(),
    amount: removed.items.reduce((sum, item) => sum + item.price, 0),
    status: 'completed',
    items: removed.items.length,
    members: removed.members.length
  });
  saveHistory(history);

  res.json({ message: 'Split deleted and moved to history' });
});

// POST /api/splits/:id/join - Join a split
app.post('/api/splits/:id/join', (req, res) => {
  const { name, color } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  const splits = getSplits();
  const split = splits.find(s => s.id === req.params.id || s.code === req.params.id);
  if (!split) {
    return res.status(404).json({ error: 'Split not found' });
  }

  // Check if member already exists
  if (split.members.find(m => m.name.toLowerCase() === name.toLowerCase())) {
    return res.status(400).json({ error: 'Member already exists' });
  }

  split.members.push({
    name: name,
    color: color || 'bg-blue-500',
    initial: name.charAt(0).toUpperCase(),
    paid: false,
    isHost: false
  });

  saveSplits(splits);
  res.json(split);
});

// POST /api/splits/:id/items - Add items to a split
app.post('/api/splits/:id/items', (req, res) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'items array is required' });
  }

  const splits = getSplits();
  const split = splits.find(s => s.id === req.params.id || s.code === req.params.id);
  if (!split) {
    return res.status(404).json({ error: 'Split not found' });
  }

  items.forEach(item => {
    split.items.push({
      id: uuidv4().slice(0, 8),
      name: item.name,
      price: parseFloat(item.price) || 0,
      claims: item.claims || []
    });
  });

  saveSplits(splits);
  res.json(split);
});

// PUT /api/splits/:id/items/:itemId - Update an item (claim/unclaim)
app.put('/api/splits/:id/items/:itemId', (req, res) => {
  const splits = getSplits();
  const split = splits.find(s => s.id === req.params.id || s.code === req.params.id);
  if (!split) {
    return res.status(404).json({ error: 'Split not found' });
  }

  const item = split.items.find(i => i.id === req.params.itemId);
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }

  if (req.body.claims !== undefined) {
    item.claims = req.body.claims;
  }
  if (req.body.name !== undefined) {
    item.name = req.body.name;
  }
  if (req.body.price !== undefined) {
    item.price = parseFloat(req.body.price);
  }

  saveSplits(splits);
  res.json(split);
});

// POST /api/splits/:id/claim - Toggle claim for a user on an item
app.post('/api/splits/:id/claim', (req, res) => {
  const { itemId, userName } = req.body;
  if (!itemId || !userName) {
    return res.status(400).json({ error: 'itemId and userName are required' });
  }

  const splits = getSplits();
  const split = splits.find(s => s.id === req.params.id || s.code === req.params.id);
  if (!split) {
    return res.status(404).json({ error: 'Split not found' });
  }

  const item = split.items.find(i => i.id === itemId);
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }

  const idx = item.claims.indexOf(userName);
  if (idx > -1) {
    item.claims.splice(idx, 1);
  } else {
    item.claims.push(userName);
  }

  saveSplits(splits);
  res.json({ item, split });
});

// POST /api/splits/:id/pay - Mark a member as paid
app.post('/api/splits/:id/pay', (req, res) => {
  const { memberName } = req.body;
  if (!memberName) {
    return res.status(400).json({ error: 'memberName is required' });
  }

  const splits = getSplits();
  const split = splits.find(s => s.id === req.params.id || s.code === req.params.id);
  if (!split) {
    return res.status(404).json({ error: 'Split not found' });
  }

  const member = split.members.find(m => m.name === memberName);
  if (!member) {
    return res.status(404).json({ error: 'Member not found' });
  }

  member.paid = true;
  saveSplits(splits);
  res.json(split);
});

// PUT /api/splits/:id/qr - Update payment QR
app.put('/api/splits/:id/qr', (req, res) => {
  const { provider, accountName, preview } = req.body;

  const splits = getSplits();
  const split = splits.find(s => s.id === req.params.id || s.code === req.params.id);
  if (!split) {
    return res.status(404).json({ error: 'Split not found' });
  }

  split.paymentQR = {
    provider: provider || split.paymentQR.provider,
    accountName: accountName || split.paymentQR.accountName,
    preview: preview || split.paymentQR.preview
  };

  saveSplits(splits);
  res.json(split);
});

// GET /api/history - Get split history
app.get('/api/history', (req, res) => {
  const history = getHistory();
  res.json(history);
});

// POST /api/splits/:id/complete - Complete a split and move to history
app.post('/api/splits/:id/complete', (req, res) => {
  const splits = getSplits();
  const index = splits.findIndex(s => s.id === req.params.id || s.code === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Split not found' });
  }

  const split = splits[index];
  split.status = 'completed';

  // Move to history
  const history = getHistory();
  history.push({
    id: split.id,
    name: split.groupName,
    date: split.createdAt.split('T')[0],
    completedAt: new Date().toISOString(),
    amount: split.items.reduce((sum, item) => sum + item.price, 0),
    status: 'completed',
    items: split.items.length,
    members: split.members.length
  });
  saveHistory(history);

  // Remove from active splits
  splits.splice(index, 1);
  saveSplits(splits);

  res.json({ message: 'Split completed', history: history[history.length - 1] });
});

// Serve the frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`NexusSplit server running on http://localhost:${PORT}`);
});
