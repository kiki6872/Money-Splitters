// ============================================================
// NexusSplit - JSON Storage Layer (localStorage)
// All data is stored as JSON in localStorage
// ============================================================

const STORAGE_KEYS = {
  SPLITS: 'nexussplit_splits',
  HISTORY: 'nexussplit_history',
  SESSION: 'nexussplit_session'
};

// ============ JSON DATA STORE ============
const DataStore = {
  getSplits() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SPLITS);
      return raw ? JSON.parse(raw) : [];
    } catch(e) { return []; }
  },

  saveSplits(splits) {
    localStorage.setItem(STORAGE_KEYS.SPLITS, JSON.stringify(splits));
  },

  getHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return raw ? JSON.parse(raw) : [];
    } catch(e) { return []; }
  },

  saveHistory(history) {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  },

  getSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
      return raw ? JSON.parse(raw) : { currentUser: '', currentSplitId: null };
    } catch(e) { return { currentUser: '', currentSplitId: null }; }
  },

  saveSession(session) {
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
  },

  // Find a split by ID or code
  findSplit(idOrCode) {
    const splits = this.getSplits();
    return splits.find(s => s.id === idOrCode || s.code === idOrCode) || null;
  },

  // Update a split in storage
  updateSplit(splitId, updater) {
    const splits = this.getSplits();
    const index = splits.findIndex(s => s.id === splitId);
    if (index === -1) return null;
    if (typeof updater === 'function') {
      updater(splits[index]);
    } else {
      Object.assign(splits[index], updater);
    }
    this.saveSplits(splits);
    return splits[index];
  },

  // Generate unique ID
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  },

  // Export all data as JSON (for backup)
  exportAll() {
    return JSON.stringify({
      splits: this.getSplits(),
      history: this.getHistory(),
      session: this.getSession(),
      exportedAt: new Date().toISOString()
    }, null, 2);
  },

  // Import data from JSON
  importAll(jsonString) {
    const data = JSON.parse(jsonString);
    if (data.splits) this.saveSplits(data.splits);
    if (data.history) this.saveHistory(data.history);
    if (data.session) this.saveSession(data.session);
  }
};

// ============ APP STATE ============
let appState = {
  currentUser: '',
  currentSplitId: null,
  selectedColor: 'bg-pink-500',
  selectedProvider: 'duitnow',
  qrPreviewData: null,
  manualItems: []
};

function loadSession() {
  const session = DataStore.getSession();
  appState.currentUser = session.currentUser || '';
  appState.currentSplitId = session.currentSplitId || null;
}

function saveSession() {
  DataStore.saveSession({
    currentUser: appState.currentUser,
    currentSplitId: appState.currentSplitId
  });
}

// ============ NAVIGATION ============
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(page);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (page === 'claiming') loadClaimingPage();
    if (page === 'balance') loadBalancePage();
    if (page === 'settlement') loadSettlementPage();
    if (page === 'reconcile') loadReconcilePage();
    if (page === 'history') loadHistoryPage();
    if (page === 'share') loadSharePage();
    if (page === 'profile') loadProfilePage();
  }
}

// ============ TOAST ============
function showToast(message, type) {
  type = type || 'success';
  const container = document.getElementById('toastContainer');
  container.className = 'toast ' + type;
  container.innerHTML = message;
  setTimeout(function() { container.classList.add('show'); }, 10);
  setTimeout(function() { container.classList.remove('show'); }, 3500);
}

// ============ MOBILE MENU ============
function toggleMobileMenu() {
  document.getElementById('mobileMenu').classList.toggle('hidden');
}

// ============ AVATAR & PROVIDER ============
function selectAvatar(btn) {
  document.querySelectorAll('#join .avatar').forEach(function(a) {
    a.classList.remove('ring-2', 'ring-white');
  });
  btn.classList.add('ring-2', 'ring-white');
  appState.selectedColor = btn.dataset.color;
}

function selectProvider(btn) {
  document.querySelectorAll('.provider-card').forEach(function(c) { c.classList.remove('selected'); });
  btn.classList.add('selected');
  appState.selectedProvider = btn.dataset.provider;
}

// ============ FILE UPLOADS ============
function handleQRUpload(input) {
  if (input.files && input.files[0]) {
    var reader = new FileReader();
    reader.onload = function(e) {
      appState.qrPreviewData = e.target.result;
      document.getElementById('qrPlaceholder').classList.add('hidden');
      document.getElementById('qrPreview').classList.remove('hidden');
      document.getElementById('qrImg').src = e.target.result;
      showToast('✅ Host QR uploaded!', 'success');
    };
    reader.readAsDataURL(input.files[0]);
  }
}

// ============ CREATE PAGE ITEMS ============
var createItems = [];

function addCreateItem() {
  var name = document.getElementById('createItemName').value.trim();
  var price = parseFloat(document.getElementById('createItemPrice').value) || 0;
  if (!name) { showToast('⚠️ Enter item name', 'warning'); return; }
  if (price <= 0) { showToast('⚠️ Enter a valid price', 'warning'); return; }
  createItems.push({ name: name, price: price });
  document.getElementById('createItemName').value = '';
  document.getElementById('createItemPrice').value = '';
  renderCreateItems();
}

function removeCreateItem(index) {
  createItems.splice(index, 1);
  renderCreateItems();
}

function renderCreateItems() {
  var container = document.getElementById('createItemsList');
  if (!container) return;
  var taxEl = document.getElementById('createTax');
  var serviceEl = document.getElementById('createService');
  var taxPct = taxEl ? (parseFloat(taxEl.value) || 0) : 0;
  var servicePct = serviceEl ? (parseFloat(serviceEl.value) || 0) : 0;
  var totalMarkup = 1 + (taxPct / 100) + (servicePct / 100);
  var hasMarkup = (taxPct > 0 || servicePct > 0);

  if (createItems.length === 0) {
    container.innerHTML = '';
    document.getElementById('createTotalDisplay').classList.add('hidden');
    return;
  }

  container.innerHTML = createItems.map(function(item, i) {
    var finalPrice = parseFloat((item.price * totalMarkup).toFixed(2));
    var priceHTML = hasMarkup
      ? '<div class="text-right"><span class="text-indigo-400 font-bold text-sm">RM' + finalPrice.toFixed(2) + '</span><p class="text-xs text-gray-500 line-through">RM' + item.price.toFixed(2) + '</p></div>'
      : '<span class="text-indigo-400 font-bold text-sm">RM' + item.price.toFixed(2) + '</span>';

    return '<div class="flex items-center gap-2 p-3 bg-black/30 rounded-lg border border-white/5">' +
      '<span class="text-xs text-gray-500 w-5">' + (i + 1) + '.</span>' +
      '<span class="flex-1 text-sm font-medium">' + item.name + '</span>' +
      priceHTML +
      '<button class="text-red-400 hover:text-red-300 text-sm ml-1" onclick="removeCreateItem(' + i + ')">✕</button>' +
    '</div>';
  }).join('');

  // Show total
  var subtotal = createItems.reduce(function(s, i) { return s + i.price; }, 0);
  var total = parseFloat((subtotal * totalMarkup).toFixed(2));
  document.getElementById('createTotalDisplay').classList.remove('hidden');
  document.getElementById('createTotalAmount').textContent = 'RM' + total.toFixed(2);

  if (hasMarkup) {
    container.innerHTML += '<p class="text-xs text-gray-500 mt-2">💡 Tax & service included in each item</p>';
  }
}

// ============ CREATE SPLIT ============
function createSplit() {
  var groupName = document.getElementById('groupName').value.trim();
  var hostName = document.getElementById('hostName').value.trim();
  var accountName = document.getElementById('accountName').value.trim();

  if (!groupName) { showToast('⚠️ Please enter a group name', 'warning'); return; }
  if (!hostName) { showToast('⚠️ Please enter your name', 'warning'); return; }

  var splitId = DataStore.generateId();
  var code = groupName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8) + splitId.substring(0, 4).toUpperCase();

  // Calculate items with tax/service included
  var taxPct = parseFloat(document.getElementById('createTax').value) || 0;
  var servicePct = parseFloat(document.getElementById('createService').value) || 0;
  var totalMarkup = 1 + (taxPct / 100) + (servicePct / 100);

  var splitItems = createItems.map(function(item) {
    return {
      id: DataStore.generateId(),
      name: item.name,
      price: parseFloat((item.price * totalMarkup).toFixed(2)),
      claims: []
    };
  });

  var newSplit = {
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
    items: splitItems,
    paymentQR: {
      provider: appState.selectedProvider,
      accountName: accountName,
      preview: appState.qrPreviewData
    }
  };

  var splits = DataStore.getSplits();
  splits.push(newSplit);
  DataStore.saveSplits(splits);

  appState.currentSplitId = splitId;
  appState.currentUser = hostName;
  saveSession();

  // Save QR to user profile if logged in
  var loggedIn = JSON.parse(localStorage.getItem('nexussplit_loggedIn') || 'null');
  if (loggedIn && appState.qrPreviewData) {
    loggedIn.qrPreview = appState.qrPreviewData;
    localStorage.setItem('nexussplit_loggedIn', JSON.stringify(loggedIn));
    // Also update in users list
    var users = JSON.parse(localStorage.getItem('nexussplit_users') || '[]');
    var userIdx = users.findIndex(function(u) { return u.email === loggedIn.email; });
    if (userIdx > -1) { users[userIdx].qrPreview = appState.qrPreviewData; localStorage.setItem('nexussplit_users', JSON.stringify(users)); }
  }

  // Reset create items
  createItems = [];

  document.getElementById('shareCode').textContent = code;
  document.getElementById('shareLink').textContent = window.location.origin + '?split=' + code;
  navigate('share');
  showToast('🎉 Split "' + groupName + '" created!', 'success');
}

// ============ SHARE ============
function generateQRCode() {
  var qrContainer = document.getElementById('qrCode');
  if (!qrContainer) return;
  qrContainer.innerHTML = '';
  if (typeof QRCode === 'undefined') return;
  var linkEl = document.getElementById('shareLink');
  var link = linkEl ? linkEl.textContent.trim() : '';
  if (link && link.length > 3) {
    try {
      new QRCode(qrContainer, {
        text: link,
        width: 160,
        height: 160,
        colorDark: '#1e293b',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
    } catch(e) {
      console.error('QR generation failed:', e);
    }
  }
}

function loadSharePage() {
  if (!appState.currentSplitId) return;
  var split = DataStore.findSplit(appState.currentSplitId);
  if (!split) return;

  // Ensure share link/code are set
  var codeEl = document.getElementById('shareCode');
  var linkEl = document.getElementById('shareLink');
  if (codeEl && !codeEl.textContent) codeEl.textContent = split.code;
  if (linkEl && !linkEl.textContent) linkEl.textContent = window.location.origin + '?split=' + split.code;

  generateQRCode();

  // Update title
  var titleEl = document.getElementById('shareGroupTitle');
  if (titleEl) titleEl.textContent = split.groupName;

  // Current user display
  var userEl = document.getElementById('shareCurrentUser');
  if (userEl) userEl.textContent = appState.currentUser;

  // Member avatars
  var avatarsEl = document.getElementById('shareAvatars');
  if (avatarsEl) {
    avatarsEl.innerHTML = split.members.map(function(m) {
      return '<div class="avatar ' + m.color + ' w-7 h-7 text-xs border-2 border-gray-800" title="' + m.name + '">' + m.initial + '</div>';
    }).join('');
  }
  var countEl = document.getElementById('shareMemberCount');
  if (countEl) countEl.textContent = split.members.length + ' joined';

  // Render claim items
  renderShareClaimItems(split);

  // Update payment total
  updateShareMyTotal(split);

  // Update stats
  updateShareStats(split);

  // Update member payment status
  renderShareMemberStatus(split);
}

function renderShareClaimItems(split) {
  var container = document.getElementById('shareClaimItems');
  if (!container) return;

  if (split.items.length === 0) {
    container.innerHTML = '<div class="col-span-2 text-center py-12 card">' +
      '<div class="text-5xl mb-4">🧾</div>' +
      '<p class="text-gray-400 mb-4">No items yet. Add items to start claiming!</p>' +
      '<button class="btn-primary" onclick="navigate(\'scanner\')">+ Add Items</button></div>';
    return;
  }

  container.innerHTML = split.items.map(function(item) {
    var userClaimed = item.claims.indexOf(appState.currentUser) > -1;
    var claimCount = item.claims.length;
    var statusBadge = '';
    var statusClass = '';

    if (claimCount === 0) {
      statusBadge = '<span class="text-xs px-2 py-1 rounded-full bg-gray-700 text-gray-400">Unclaimed</span>';
    } else if (claimCount === 1) {
      statusBadge = '<span class="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">Claimed</span>';
      statusClass = 'claimed';
    } else {
      statusBadge = '<span class="text-xs px-2 py-1 rounded-full bg-indigo-500/20 text-indigo-300">Shared (' + claimCount + ')</span>';
      statusClass = 'claimed';
    }

    var claimersHTML = item.claims.map(function(c) {
      var member = split.members.find(function(m) { return m.name === c; });
      var color = member ? member.color : 'bg-gray-500';
      var initial = member ? member.initial : c.charAt(0);
      return '<div class="avatar ' + color + ' w-6 h-6 text-xs" title="' + c + '">' + initial + '</div>';
    }).join('');

    return '<div class="item-card ' + statusClass + '" onclick="shareToggleClaim(\'' + item.id + '\')">' +
      '<div class="flex justify-between items-start mb-3">' +
        '<span class="font-semibold text-sm">' + item.name + '</span>' +
        '<span class="text-purple-400 font-bold">RM' + item.price.toFixed(2) + '</span>' +
      '</div>' +
      '<div class="flex items-center justify-between">' +
        '<div class="flex items-center gap-2">' +
          (claimersHTML ? '<div class="flex -space-x-1">' + claimersHTML + '</div>' : '<span class="text-xs text-gray-500">Tap to claim</span>') +
        '</div>' +
        statusBadge +
      '</div>' +
      (userClaimed ? '<div class="absolute top-2 right-2 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg></div>' : '') +
    '</div>';
  }).join('');
}

function shareToggleClaim(itemId) {
  if (!appState.currentUser) {
    showToast('⚠️ Please join the split first', 'warning');
    return;
  }

  var split = DataStore.updateSplit(appState.currentSplitId, function(s) {
    var item = s.items.find(function(i) { return i.id === itemId; });
    if (!item) return;
    var idx = item.claims.indexOf(appState.currentUser);
    if (idx > -1) {
      item.claims.splice(idx, 1);
    } else {
      item.claims.push(appState.currentUser);
    }
  });

  if (split) {
    var item = split.items.find(function(i) { return i.id === itemId; });
    var claimed = item && item.claims.indexOf(appState.currentUser) > -1;
    showToast(claimed ? '✅ Claimed ' + item.name : '❌ Unclaimed ' + item.name, claimed ? 'success' : 'warning');
    renderShareClaimItems(split);
    updateShareMyTotal(split);
    updateShareStats(split);
    renderShareMemberStatus(split);
  }
}

function updateShareMyTotal(split) {
  var myShare = 0;
  split.items.forEach(function(item) {
    if (item.claims.indexOf(appState.currentUser) > -1) {
      myShare += item.price / item.claims.length;
    }
  });
  var el = document.getElementById('shareMyTotal');
  if (el) el.textContent = 'RM' + myShare.toFixed(2);
}

function updateShareStats(split) {
  var total = split.items.reduce(function(s, i) { return s + i.price; }, 0);
  var claimed = split.items.filter(function(i) { return i.claims.length > 0; }).reduce(function(s, i) { return s + i.price; }, 0);
  var unclaimed = total - claimed;
  var progress = total > 0 ? Math.round((claimed / total) * 100) : 0;

  var el1 = document.getElementById('shareTotalBill');
  var el2 = document.getElementById('shareClaimed');
  var el3 = document.getElementById('shareUnclaimed');
  var el4 = document.getElementById('shareProgress');

  if (el1) el1.textContent = 'RM' + total.toFixed(0);
  if (el2) el2.textContent = 'RM' + claimed.toFixed(0);
  if (el3) el3.textContent = 'RM' + unclaimed.toFixed(0);
  if (el4) el4.textContent = progress + '%';
}

function renderShareMemberStatus(split) {
  var container = document.getElementById('shareMemberStatus');
  var list = document.getElementById('shareMemberStatusList');
  if (!container || !list) return;

  var balances = calculateBalances(split);
  var hasItems = split.items.length > 0;

  if (!hasItems) {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');
  list.innerHTML = split.members.map(function(m) {
    var amt = balances[m.name] || 0;
    var statusHTML = '';
    if (m.paid) {
      statusHTML = '<span class="flex items-center gap-1 text-green-400 font-medium text-sm">✔ Paid</span>';
    } else if (amt > 0) {
      statusHTML = '<span class="text-yellow-400 font-medium text-sm">⏳ Owes RM' + amt.toFixed(2) + '</span>';
    } else {
      statusHTML = '<span class="text-gray-500 text-sm">No items selected</span>';
    }

    return '<div class="flex items-center justify-between p-3 rounded-xl ' + (m.paid ? 'bg-green-500/5 border border-green-500/20' : 'bg-black/20 border border-white/5') + '">' +
      '<div class="flex items-center gap-3">' +
        '<div class="avatar ' + m.color + ' w-8 h-8 text-xs">' + m.initial + '</div>' +
        '<span class="font-medium text-sm">' + m.name + (m.isHost ? ' <span class="text-indigo-400 text-xs">(Host)</span>' : '') + '</span>' +
      '</div>' +
      statusHTML +
    '</div>';
  }).join('');
}

function copyCode() {
  var code = document.getElementById('shareCode').textContent;
  navigator.clipboard.writeText(code).then(function() { showToast('📋 Code copied!'); });
}

function copyLink() {
  var link = document.getElementById('shareLink').textContent;
  navigator.clipboard.writeText(link).then(function() { showToast('📋 Link copied!'); });
}

function shareWhatsApp() {
  var link = document.getElementById('shareLink').textContent;
  var code = document.getElementById('shareCode').textContent;
  window.open('https://wa.me/?text=' + encodeURIComponent('Join our bill split! Code: ' + code + ' Link: ' + link), '_blank');
}

function shareTelegram() {
  var link = document.getElementById('shareLink').textContent;
  window.open('https://t.me/share/url?url=' + encodeURIComponent(link) + '&text=' + encodeURIComponent('Join our bill split!'), '_blank');
}

// ============ JOIN GROUP ============
function joinGroup() {
  var code = document.getElementById('joinCode').value.trim();
  var name = document.getElementById('joinName').value.trim();

  if (!code) { showToast('⚠️ Please enter a split code', 'warning'); return; }
  if (!name) { showToast('⚠️ Please enter your name', 'warning'); return; }

  var split = DataStore.findSplit(code);
  if (!split) {
    showToast('❌ Split not found. Check the code.', 'error');
    return;
  }

  // Check if already joined
  if (split.members.find(function(m) { return m.name.toLowerCase() === name.toLowerCase(); })) {
    // Already a member, just set session
    appState.currentSplitId = split.id;
    appState.currentUser = name;
    saveSession();
    // Set share page info
    document.getElementById('shareCode').textContent = split.code;
    document.getElementById('shareLink').textContent = window.location.origin + '?split=' + split.code;
    showToast('👋 Welcome back ' + name + '!', 'success');
    navigate('share');
    return;
  }

  // Add new member
  DataStore.updateSplit(split.id, function(s) {
    s.members.push({
      name: name,
      color: appState.selectedColor,
      initial: name.charAt(0).toUpperCase(),
      paid: false,
      isHost: false
    });
  });

  appState.currentSplitId = split.id;
  appState.currentUser = name;
  saveSession();

  // Set share page info
  document.getElementById('shareCode').textContent = split.code;
  document.getElementById('shareLink').textContent = window.location.origin + '?split=' + split.code;

  showToast('👋 Welcome ' + name + '!', 'success');
  navigate('share');
}

// ============ MANUAL ITEMS ============
function addManualItem() {
  var name = document.getElementById('newItemName').value.trim();
  var price = parseFloat(document.getElementById('newItemPrice').value) || 0;

  if (!name) { showToast('⚠️ Enter item name', 'warning'); return; }
  if (price <= 0) { showToast('⚠️ Enter a valid price', 'warning'); return; }

  appState.manualItems.push({ name: name, price: price });
  document.getElementById('newItemName').value = '';
  document.getElementById('newItemPrice').value = '';
  renderManualItems();
  recalculateTotal();
}

function removeManualItem(index) {
  appState.manualItems.splice(index, 1);
  renderManualItems();
  recalculateTotal();
}

function renderManualItems() {
  var container = document.getElementById('manualItemsList');
  if (!container) return;

  var taxEl = document.getElementById('taxInput');
  var serviceEl = document.getElementById('serviceInput');
  var taxPct = taxEl ? (parseFloat(taxEl.value) || 0) : 0;
  var servicePct = serviceEl ? (parseFloat(serviceEl.value) || 0) : 0;
  var totalMarkup = 1 + (taxPct / 100) + (servicePct / 100);
  var hasMarkup = (taxPct > 0 || servicePct > 0);

  if (appState.manualItems.length === 0) {
    container.innerHTML = '<div class="text-center py-6 text-gray-500 text-sm border-2 border-dashed border-gray-700 rounded-xl">' +
      '<p>No items added yet</p>' +
      '<p class="text-xs mt-1">Type item name and price above, then click "+ Add"</p></div>';
  } else {
    container.innerHTML = appState.manualItems.map(function(item, i) {
      var finalPrice = parseFloat((item.price * totalMarkup).toFixed(2));
      var priceDisplay = '';
      if (hasMarkup) {
        priceDisplay = '<div class="text-right">' +
          '<span class="text-indigo-400 font-bold">RM' + finalPrice.toFixed(2) + '</span>' +
          '<p class="text-xs text-gray-500 line-through">RM' + item.price.toFixed(2) + '</p>' +
          '</div>';
      } else {
        priceDisplay = '<span class="text-indigo-400 font-bold">RM' + item.price.toFixed(2) + '</span>';
      }

      return '<div class="flex items-center gap-3 p-4 bg-black/30 rounded-xl border border-white/5">' +
        '<div class="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-sm font-bold">' + (i + 1) + '</div>' +
        '<span class="flex-1 font-medium">' + item.name + '</span>' +
        priceDisplay +
        '<button class="text-red-400 hover:text-red-300 ml-2 text-lg" onclick="removeManualItem(' + i + ')" title="Remove">✕</button>' +
        '</div>';
    }).join('');

    if (hasMarkup) {
      container.innerHTML += '<p class="text-xs text-gray-500 mt-2 text-center">💡 Tax & service are automatically included in each item price</p>';
    }
  }

  var totalSection = document.getElementById('totalSection');
  if (totalSection) totalSection.classList.toggle('hidden', appState.manualItems.length === 0);
}

function recalculateTotal() {
  var subtotal = appState.manualItems.reduce(function(s, i) { return s + i.price; }, 0);
  var taxEl = document.getElementById('taxInput');
  var serviceEl = document.getElementById('serviceInput');
  if (!taxEl || !serviceEl) return;

  var taxPct = parseFloat(taxEl.value) || 0;
  var servicePct = parseFloat(serviceEl.value) || 0;
  var tax = subtotal * taxPct / 100;
  var service = subtotal * servicePct / 100;

  document.getElementById('subtotalDisplay').textContent = 'RM' + subtotal.toFixed(2);
  document.getElementById('taxDisplay').textContent = 'RM' + tax.toFixed(2);
  document.getElementById('serviceDisplay').textContent = 'RM' + service.toFixed(2);
  document.getElementById('totalDisplay').textContent = 'RM' + (subtotal + tax + service).toFixed(2);
}

function confirmItems() {
  if (appState.manualItems.length === 0) {
    showToast('⚠️ Add at least one item', 'warning');
    return;
  }
  if (!appState.currentSplitId) {
    showToast('⚠️ No active split. Create or join one first.', 'warning');
    return;
  }

  var taxPct = parseFloat(document.getElementById('taxInput').value) || 0;
  var servicePct = parseFloat(document.getElementById('serviceInput').value) || 0;
  var totalMarkup = 1 + (taxPct / 100) + (servicePct / 100);

  DataStore.updateSplit(appState.currentSplitId, function(split) {
    appState.manualItems.forEach(function(item) {
      // Each item price includes its proportional share of tax & service
      var finalPrice = parseFloat((item.price * totalMarkup).toFixed(2));
      split.items.push({
        id: DataStore.generateId(),
        name: item.name,
        price: finalPrice,
        claims: []
      });
    });
  });

  appState.manualItems = [];
  renderManualItems();
  recalculateTotal();
  showToast('✅ Items added!', 'success');
  navigate('share');
}

// ============ CLAIMING PAGE ============
function loadClaimingPage() {
  if (!appState.currentSplitId) {
    showToast('⚠️ No active split', 'warning');
    navigate('landing');
    return;
  }

  var split = DataStore.findSplit(appState.currentSplitId);
  if (!split) {
    showToast('❌ Split not found', 'error');
    navigate('landing');
    return;
  }

  renderClaimingPage(split);
}

function renderClaimingPage(split) {
  document.getElementById('claimingTitle').textContent = split.groupName;
  document.getElementById('currentUserDisplay').textContent = appState.currentUser;

  // Avatars
  document.getElementById('claimingAvatars').innerHTML = split.members.map(function(m) {
    return '<div class="avatar ' + m.color + ' w-8 h-8 text-xs border-2 border-gray-800">' + m.initial + '</div>';
  }).join('');
  document.getElementById('claimingMemberCount').textContent = split.members.length + ' joined';

  // Items
  var container = document.getElementById('claimingItems');
  if (split.items.length === 0) {
    container.innerHTML = '<div class="col-span-2 text-center py-12">' +
      '<div class="text-5xl mb-4">🧾</div>' +
      '<p class="text-gray-400 mb-4">No items yet. Add items to start claiming!</p>' +
      '<button class="btn-primary" onclick="navigate(\'scanner\')">+ Add Items</button></div>';
  } else {
    container.innerHTML = split.items.map(function(item) {
      var userClaimed = item.claims.indexOf(appState.currentUser) > -1;
      var claimersHTML = item.claims.map(function(c) {
        var member = split.members.find(function(m) { return m.name === c; });
        var color = member ? member.color : 'bg-gray-500';
        var initial = member ? member.initial : c.charAt(0);
        return '<div class="avatar ' + color + ' w-7 h-7 text-xs">' + initial + '</div>';
      }).join('');

      return '<div class="item-card ' + (userClaimed ? 'claimed' : '') + '" onclick="toggleClaim(\'' + item.id + '\')">' +
        '<div class="flex justify-between items-center mb-2">' +
        '<span class="font-semibold">' + item.name + '</span>' +
        '<span class="text-indigo-400 font-bold">RM' + item.price.toFixed(2) + '</span></div>' +
        '<div class="flex items-center justify-between">' +
        '<div class="flex -space-x-2">' + (claimersHTML || '<span class="text-xs text-gray-500">Tap to claim</span>') + '</div>' +
        '<span class="text-xs text-gray-400">' + (item.claims.length > 0 ? item.claims.join(', ') : 'Unclaimed') + '</span></div>' +
        (userClaimed ? '<div class="absolute top-2 right-2 text-green-400 text-xs font-bold">✓ You</div>' : '') +
        '</div>';
    }).join('');
  }

  updateClaimingStats(split);
  updateMyTotal(split);
}

function toggleClaim(itemId) {
  if (!appState.currentUser) {
    showToast('⚠️ Please join the split first', 'warning');
    return;
  }

  var split = DataStore.updateSplit(appState.currentSplitId, function(s) {
    var item = s.items.find(function(i) { return i.id === itemId; });
    if (!item) return;

    var idx = item.claims.indexOf(appState.currentUser);
    if (idx > -1) {
      item.claims.splice(idx, 1);
    } else {
      item.claims.push(appState.currentUser);
    }
  });

  if (split) {
    var item = split.items.find(function(i) { return i.id === itemId; });
    var claimed = item && item.claims.indexOf(appState.currentUser) > -1;
    showToast(claimed ? '✅ Claimed ' + item.name : '❌ Unclaimed ' + item.name, claimed ? 'success' : 'warning');
    renderClaimingPage(split);
  }
}

function updateClaimingStats(split) {
  var total = split.items.reduce(function(s, i) { return s + i.price; }, 0);
  var claimed = split.items.filter(function(i) { return i.claims.length > 0; }).reduce(function(s, i) { return s + i.price; }, 0);
  document.getElementById('totalBill').textContent = 'RM' + total.toFixed(0);
  document.getElementById('claimedAmount').textContent = 'RM' + claimed.toFixed(0);
  document.getElementById('unclaimedAmount').textContent = 'RM' + (total - claimed).toFixed(0);
  document.getElementById('claimProgress').textContent = total > 0 ? Math.round((claimed / total) * 100) + '%' : '0%';
}

function updateMyTotal(split) {
  var myShare = 0;
  split.items.forEach(function(item) {
    if (item.claims.indexOf(appState.currentUser) > -1) {
      myShare += item.price / item.claims.length;
    }
  });
  document.getElementById('myTotalAmount').textContent = 'RM' + myShare.toFixed(2);
}

// ============ BALANCE HELPERS ============
function calculateBalances(split) {
  var balances = {};
  split.members.forEach(function(m) { balances[m.name] = 0; });
  split.items.forEach(function(item) {
    if (item.claims.length > 0) {
      var share = item.price / item.claims.length;
      item.claims.forEach(function(c) {
        if (balances[c] !== undefined) balances[c] += share;
      });
    }
  });
  return balances;
}

// ============ BALANCE PAGE ============
function loadBalancePage() {
  if (!appState.currentSplitId) { navigate('landing'); return; }
  var split = DataStore.findSplit(appState.currentSplitId);
  if (!split) { navigate('landing'); return; }

  var total = split.items.reduce(function(s, i) { return s + i.price; }, 0);
  var balances = calculateBalances(split);
  var hostShare = balances[split.host] || 0;

  document.getElementById('balTotalBill').textContent = 'RM' + total.toFixed(2);
  document.getElementById('balHostAmount').textContent = 'RM' + (total - hostShare).toFixed(2);
  document.getElementById('balMemberCount').textContent = split.members.length;

  document.getElementById('balanceList').innerHTML = split.members.map(function(m) {
    var amt = balances[m.name] || 0;
    return '<div class="balance-item">' +
      '<div class="flex items-center gap-3">' +
      '<div class="avatar ' + m.color + '">' + m.initial + '</div>' +
      '<div><span class="font-medium">' + m.name + '</span>' +
      (m.isHost ? '<span class="text-xs text-indigo-400 ml-2">(Host)</span>' : '') +
      '</div></div>' +
      '<span class="font-bold text-lg ' + (m.paid ? 'text-green-400' : 'text-yellow-400') + '">' +
      'RM' + amt.toFixed(2) + (m.paid ? ' ✔' : '') + '</span></div>';
  }).join('');
}

// ============ SETTLEMENT PAGE ============
function loadSettlementPage() {
  if (!appState.currentSplitId) { navigate('landing'); return; }
  var split = DataStore.findSplit(appState.currentSplitId);
  if (!split) { navigate('landing'); return; }

  var balances = calculateBalances(split);
  var container = document.getElementById('settlementInstructions');

  container.innerHTML = split.members.filter(function(m) { return !m.isHost; }).map(function(m) {
    var amt = balances[m.name] || 0;
    return '<div class="card p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">' +
      '<div class="flex items-center gap-3">' +
      '<div class="avatar ' + m.color + '">' + m.initial + '</div>' +
      '<div><p class="font-medium">' + m.name + ' pays ' + split.host + '</p>' +
      '<p class="text-xs text-gray-400">' + (m.paid ? '✅ Already paid' : '⏳ Awaiting payment') + '</p></div></div>' +
      '<div class="flex items-center gap-3">' +
      '<span class="text-xl font-bold text-indigo-400">RM' + amt.toFixed(2) + '</span>' +
      (!m.paid ? '<button class="btn-primary text-sm px-4" onclick="openPaymentModal(\'' + m.name + '\', ' + amt + ')">Pay</button>' : '<span class="text-green-400 text-xl">✓</span>') +
      '</div></div>';
  }).join('');
}

// ============ PAYMENT MODAL ============
var currentPayingMember = '';

function openPaymentModal(name, amount) {
  currentPayingMember = name;
  var split = DataStore.findSplit(appState.currentSplitId);
  if (!split) return;

  document.getElementById('payAmount').textContent = 'RM' + amount.toFixed(2);
  document.getElementById('payTo').textContent = split.host;
  document.getElementById('payAccount').textContent = split.paymentQR.accountName || 'N/A';
  document.getElementById('payAmtCopy').textContent = 'RM' + amount.toFixed(2);
  document.getElementById('payProvider').textContent = (split.paymentQR.provider || 'duitnow').charAt(0).toUpperCase() + (split.paymentQR.provider || 'duitnow').slice(1);

  // Show items this member claimed
  var payItemsContent = document.getElementById('payItemsContent');
  if (payItemsContent) {
    var memberItems = split.items.filter(function(item) {
      return item.claims.indexOf(name) > -1;
    });
    if (memberItems.length > 0) {
      payItemsContent.innerHTML = memberItems.map(function(item) {
        var share = item.price / item.claims.length;
        return '<div class="flex justify-between text-xs mb-1">' +
          '<span class="text-gray-300">' + item.name + (item.claims.length > 1 ? ' (÷' + item.claims.length + ')' : '') + '</span>' +
          '<span class="text-indigo-400">RM' + share.toFixed(2) + '</span></div>';
      }).join('');
    } else {
      payItemsContent.innerHTML = '<p class="text-xs text-gray-500">No items claimed</p>';
    }
  }

  var qrImg = document.getElementById('modalQRImg');
  var placeholder = document.getElementById('modalQRPlaceholder');
  if (split.paymentQR.preview) {
    qrImg.src = split.paymentQR.preview;
    qrImg.classList.remove('hidden');
    placeholder.classList.add('hidden');
  } else {
    qrImg.classList.add('hidden');
    placeholder.classList.remove('hidden');
  }

  document.getElementById('paymentModal').classList.add('show');
}

function openMemberPayment() {
  if (!appState.currentSplitId || !appState.currentUser) {
    showToast('⚠️ No active split', 'warning');
    return;
  }
  var split = DataStore.findSplit(appState.currentSplitId);
  if (!split) return;

  var balances = calculateBalances(split);
  var myTotal = balances[appState.currentUser] || 0;
  if (myTotal > 0) {
    openPaymentModal(appState.currentUser, myTotal);
  } else {
    showToast('⚠️ You don\'t owe anything yet. Claim some items first!', 'warning');
  }
}

function closePaymentModal() {
  document.getElementById('paymentModal').classList.remove('show');
}

function copyAccount() {
  var text = document.getElementById('payAccount').textContent;
  navigator.clipboard.writeText(text).then(function() { showToast('📋 Copied!'); });
}

function copyPaymentAmount() {
  var amt = document.getElementById('payAmtCopy').textContent.replace('RM', '');
  navigator.clipboard.writeText(amt).then(function() { showToast('📋 Amount copied!'); });
}

function confirmPayment() {
  if (!currentPayingMember || !appState.currentSplitId) return;

  DataStore.updateSplit(appState.currentSplitId, function(split) {
    var member = split.members.find(function(m) { return m.name === currentPayingMember; });
    if (member) {
      member.paid = true;
      member.paidAt = new Date().toISOString();
    }
  });

  closePaymentModal();
  showToast('✅ Payment confirmed! ' + currentPayingMember + ' has paid.', 'success');

  // Auto-refresh all views
  var split = DataStore.findSplit(appState.currentSplitId);
  if (split) {
    var activePage = document.querySelector('.page.active');
    if (activePage) {
      var pageId = activePage.id;
      if (pageId === 'settlement') loadSettlementPage();
      if (pageId === 'reconcile') loadReconcilePage();
      if (pageId === 'claiming') renderClaimingPage(split);
      if (pageId === 'share') loadSharePage();
      if (pageId === 'balance') loadBalancePage();
    }
  }
}

// ============ RECONCILE PAGE ============
function loadReconcilePage() {
  if (!appState.currentSplitId) { navigate('landing'); return; }
  var split = DataStore.findSplit(appState.currentSplitId);
  if (!split) { navigate('landing'); return; }

  var balances = calculateBalances(split);
  var totalBill = split.items.reduce(function(s, i) { return s + i.price; }, 0);
  var paidMembers = split.members.filter(function(m) { return m.paid; });
  var collected = paidMembers.reduce(function(sum, m) { return sum + (balances[m.name] || 0); }, 0);
  var remaining = totalBill - collected;
  var percent = totalBill > 0 ? Math.round((collected / totalBill) * 100) : 0;

  document.getElementById('paidCount').textContent = paidMembers.length;
  document.getElementById('totalMembers').textContent = split.members.length;
  document.getElementById('completionPercent').textContent = percent + '%';
  document.getElementById('completionBar').style.width = percent + '%';
  document.getElementById('collectedAmount').textContent = 'RM' + collected.toFixed(2);
  document.getElementById('remainingAmount').textContent = 'RM' + remaining.toFixed(2);

  document.getElementById('reconcileList').innerHTML = split.members.map(function(m) {
    var amt = balances[m.name] || 0;
    return '<div class="balance-item">' +
      '<div class="flex items-center gap-3">' +
      '<div class="avatar ' + m.color + '">' + m.initial + '</div>' +
      '<span class="font-medium">' + m.name + '</span></div>' +
      '<div class="flex items-center gap-3">' +
      '<span class="text-sm text-gray-400">RM' + amt.toFixed(2) + '</span>' +
      (m.paid
        ? '<span class="text-green-400 font-medium">✔ Paid</span>'
        : '<span class="text-yellow-400 font-medium">⏳</span><button class="btn-primary text-xs px-3 py-1 ml-2" onclick="markPaid(\'' + m.name + '\')">Mark Paid</button>') +
      '</div></div>';
  }).join('');
}

function markPaid(name) {
  DataStore.updateSplit(appState.currentSplitId, function(split) {
    var member = split.members.find(function(m) { return m.name === name; });
    if (member) member.paid = true;
  });
  showToast('✅ ' + name + ' marked as paid!', 'success');
  loadReconcilePage();
}

function completeSplit() {
  if (!appState.currentSplitId) return;

  var split = DataStore.findSplit(appState.currentSplitId);
  if (!split) return;

  // Get logged-in user email for history ownership
  var loggedIn = JSON.parse(localStorage.getItem('nexussplit_loggedIn') || 'null');
  var userEmail = loggedIn ? loggedIn.email : null;

  // Move to history
  var history = DataStore.getHistory();
  history.push({
    id: split.id,
    name: split.groupName,
    host: split.host,
    date: split.createdAt.split('T')[0],
    completedAt: new Date().toISOString(),
    amount: split.items.reduce(function(s, i) { return s + i.price; }, 0),
    status: 'completed',
    itemCount: split.items.length,
    memberCount: split.members.length,
    members: split.members.map(function(m) { return m.name; }),
    userEmail: userEmail
  });
  DataStore.saveHistory(history);

  // Remove from active splits
  var splits = DataStore.getSplits();
  var index = splits.findIndex(function(s) { return s.id === appState.currentSplitId; });
  if (index > -1) splits.splice(index, 1);
  DataStore.saveSplits(splits);

  appState.currentSplitId = null;
  saveSession();

  showToast('🎉 Split completed and saved to history!', 'success');
  navigate('history');
}

// ============ HISTORY PAGE ============
function loadHistoryPage() {
  var allHistory = DataStore.getHistory();
  var container = document.getElementById('historyList');
  var noHistory = document.getElementById('noHistory');

  // Filter history by logged-in user — guests see nothing
  var loggedIn = JSON.parse(localStorage.getItem('nexussplit_loggedIn') || 'null');
  var history = [];

  if (loggedIn && loggedIn.email) {
    history = allHistory.filter(function(h) {
      return h.userEmail === loggedIn.email;
    });
  }
  // Guests (no loggedIn or no email) get empty history

  if (history.length === 0) {
    container.innerHTML = '';
    noHistory.classList.remove('hidden');
    document.getElementById('totalSpent').textContent = 'RM0';

    if (!loggedIn || !loggedIn.email) {
      noHistory.innerHTML = '<div class="text-5xl mb-4">🔒</div>' +
        '<p class="text-gray-400">Sign in to view your split history</p>' +
        '<button class="btn-primary mt-4" onclick="navigate(\'login\')">Sign In</button>';
    } else {
      noHistory.innerHTML = '<div class="text-5xl mb-4">📭</div>' +
        '<p class="text-gray-400">No split history yet. Create your first split!</p>';
    }
  } else {
    noHistory.classList.add('hidden');
    var totalSpent = history.reduce(function(s, h) { return s + h.amount; }, 0);
    document.getElementById('totalSpent').textContent = 'RM' + totalSpent.toFixed(0);

    container.innerHTML = history.sort(function(a, b) {
      return new Date(b.completedAt || b.date) - new Date(a.completedAt || a.date);
    }).map(function(item) {
      return '<div class="card p-4 flex items-center justify-between">' +
        '<div class="flex items-center gap-4">' +
        '<div class="text-3xl">🧾</div>' +
        '<div><p class="font-bold">' + item.name + '</p>' +
        '<p class="text-sm text-gray-400">' + item.date + ' • ' + (item.itemCount || item.items || 0) + ' items • ' + (item.memberCount || '?') + ' members</p></div></div>' +
        '<div class="flex items-center gap-4">' +
        '<span class="font-bold text-lg">RM' + item.amount.toFixed(0) + '</span>' +
        '<span class="text-xs px-2 py-1 rounded bg-green-500/20 text-green-300">Completed</span></div></div>';
    }).join('');
  }
}

// ============ AUTH & PROFILE ============
function toggleLoginPassword() {
  var input = document.getElementById('loginPassword');
  input.type = input.type === 'password' ? 'text' : 'password';
}

function toggleRegisterPassword() {
  var input = document.getElementById('registerPassword');
  input.type = input.type === 'password' ? 'text' : 'password';
}

function selectRegProvider(btn) {
  btn.parentElement.querySelectorAll('.provider-card').forEach(function(c) { c.classList.remove('selected'); });
  btn.classList.add('selected');
}

function loginUser() {
  var email = document.getElementById('loginEmail').value.trim();
  var password = document.getElementById('loginPassword').value;

  if (!email) { showToast('⚠️ Please enter your email', 'warning'); return; }
  if (!password) { showToast('⚠️ Please enter your password', 'warning'); return; }

  // Check if user exists in localStorage
  var users = JSON.parse(localStorage.getItem('nexussplit_users') || '[]');
  var user = users.find(function(u) { return u.email === email; });

  if (!user) {
    showToast('❌ Account not found. Please register first.', 'error');
    return;
  }

  if (user.password !== password) {
    showToast('❌ Incorrect password', 'error');
    return;
  }

  // Save login session
  var remember = document.getElementById('rememberMe').checked;
  localStorage.setItem('nexussplit_loggedIn', JSON.stringify({
    email: user.email,
    name: user.name,
    provider: user.provider,
    qrPreview: user.qrPreview || null,
    createdAt: user.createdAt,
    remember: remember
  }));

  appState.currentUser = user.name;
  saveSession();
  updateNavAuth();
  showToast('👋 Welcome back, ' + user.name + '!', 'success');
  navigate('landing');
}

function continueAsGuest() {
  appState.currentUser = 'Guest';
  saveSession();
  updateNavAuth();
  showToast('👋 Welcome! You\'re browsing as Guest', 'success');
  navigate('landing');
}

function registerUser() {
  var name = document.getElementById('registerName').value.trim();
  var email = document.getElementById('registerEmail').value.trim();
  var password = document.getElementById('registerPassword').value;

  if (!name) { showToast('⚠️ Please enter your name', 'warning'); return; }
  if (!email) { showToast('⚠️ Please enter your email', 'warning'); return; }
  if (!password || password.length < 6) { showToast('⚠️ Password must be at least 6 characters', 'warning'); return; }

  // Get selected provider
  var selectedBtn = document.querySelector('#register .provider-card.selected');
  var provider = selectedBtn ? selectedBtn.dataset.provider : 'duitnow';

  // Check if email already exists
  var users = JSON.parse(localStorage.getItem('nexussplit_users') || '[]');
  if (users.find(function(u) { return u.email === email; })) {
    showToast('❌ Email already registered. Please sign in.', 'error');
    return;
  }

  // Save user
  var newUser = {
    name: name,
    email: email,
    password: password,
    provider: provider,
    qrPreview: null,
    createdAt: new Date().toISOString()
  };
  users.push(newUser);
  localStorage.setItem('nexussplit_users', JSON.stringify(users));

  // Auto login
  localStorage.setItem('nexussplit_loggedIn', JSON.stringify({
    email: newUser.email,
    name: newUser.name,
    provider: newUser.provider,
    qrPreview: null,
    createdAt: newUser.createdAt,
    remember: true
  }));

  appState.currentUser = name;
  saveSession();
  updateNavAuth();
  showToast('🎉 Account created! Welcome, ' + name + '!', 'success');
  navigate('landing');
}

function logoutUser() {
  localStorage.removeItem('nexussplit_loggedIn');
  appState.currentUser = '';
  saveSession();
  updateNavAuth();
  showToast('👋 Signed out successfully', 'success');
  navigate('landing');
}

function updateNavAuth() {
  var loggedIn = JSON.parse(localStorage.getItem('nexussplit_loggedIn') || 'null');
  var profileBtn = document.getElementById('navProfileBtn');
  var loginBtn = document.getElementById('navLoginBtn');

  if (loggedIn) {
    if (profileBtn) {
      profileBtn.classList.remove('hidden');
      profileBtn.textContent = loggedIn.name.charAt(0).toUpperCase();
    }
    if (loginBtn) loginBtn.classList.add('hidden');
  } else {
    if (profileBtn) profileBtn.classList.add('hidden');
    if (loginBtn) loginBtn.classList.remove('hidden');
  }
}

function loadProfilePage() {
  var loggedIn = JSON.parse(localStorage.getItem('nexussplit_loggedIn') || 'null');
  if (!loggedIn) {
    navigate('login');
    return;
  }

  // Profile header
  var avatarEl = document.getElementById('profileAvatar');
  if (avatarEl) avatarEl.textContent = loggedIn.name.charAt(0).toUpperCase();
  var nameEl = document.getElementById('profileName');
  if (nameEl) nameEl.textContent = loggedIn.name;
  var emailEl = document.getElementById('profileEmail');
  if (emailEl) emailEl.textContent = loggedIn.email;
  var welcomeEl = document.getElementById('profileWelcome');
  if (welcomeEl) welcomeEl.textContent = 'Welcome back, ' + loggedIn.name + '! 👋';

  // Provider
  var providerEl = document.getElementById('profileProvider');
  if (providerEl) providerEl.textContent = (loggedIn.provider || 'duitnow').charAt(0).toUpperCase() + (loggedIn.provider || 'duitnow').slice(1);

  // QR
  var qrPreview = document.getElementById('profileQRPreview');
  var noQR = document.getElementById('profileNoQR');
  if (loggedIn.qrPreview) {
    if (qrPreview) { qrPreview.classList.remove('hidden'); document.getElementById('profileQRImg').src = loggedIn.qrPreview; }
    if (noQR) noQR.classList.add('hidden');
  } else {
    if (qrPreview) qrPreview.classList.add('hidden');
    if (noQR) noQR.classList.remove('hidden');
  }

  // Stats from history (filtered by user)
  var allHistory = DataStore.getHistory();
  var history = allHistory.filter(function(h) { return h.userEmail === loggedIn.email; });
  var splitCount = document.getElementById('profileSplitCount');
  var totalSpent = document.getElementById('profileTotalSpent');
  var memberSince = document.getElementById('profileMemberSince');

  if (splitCount) splitCount.textContent = history.length;
  if (totalSpent) {
    var total = history.reduce(function(s, h) { return s + (h.amount || 0); }, 0);
    totalSpent.textContent = 'RM' + total.toFixed(0);
  }
  if (memberSince && loggedIn.createdAt) {
    var date = new Date(loggedIn.createdAt);
    memberSince.textContent = date.toLocaleDateString('en-MY', { month: 'short', year: 'numeric' });
  }

  // Recent history
  var historyContainer = document.getElementById('profileHistory');
  if (historyContainer) {
    if (history.length === 0) {
      historyContainer.innerHTML = '<p class="text-sm text-gray-500 text-center py-4">No split history yet</p>';
    } else {
      historyContainer.innerHTML = history.slice(-3).reverse().map(function(h) {
        return '<div class="flex items-center justify-between p-3 bg-black/20 rounded-lg">' +
          '<div class="flex items-center gap-3"><span class="text-lg">🧾</span><span class="text-sm font-medium">' + h.name + '</span></div>' +
          '<span class="text-sm text-indigo-400 font-bold">RM' + (h.amount || 0).toFixed(0) + '</span></div>';
      }).join('');
    }
  }
}

// ============ INIT ============
document.addEventListener('DOMContentLoaded', function() {
  try {
    loadSession();
    updateNavAuth();

    // Auto-set user name from login if available
    var loggedIn = JSON.parse(localStorage.getItem('nexussplit_loggedIn') || 'null');
    if (loggedIn && !appState.currentUser) {
      appState.currentUser = loggedIn.name;
      saveSession();
    }

    // Check URL for split code
    var params = new URLSearchParams(window.location.search);
    var splitCode = params.get('split');
    if (splitCode) {
      document.getElementById('joinCode').value = splitCode;
      navigate('join');
    } else {
      navigate('landing');
    }
  } catch(e) {
    console.error('Init error:', e);
    navigate('landing');
  }
});
