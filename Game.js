class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.entities = [];
    this.remotePlayers = {};
    this.scrollX = 0;
    this.scrollY = 0;
    this.lastTime = 0;
    this.myPlayerIndex = -1;
    this.isConnected = false;
    this.itemDb = new ItemDatabase();
    this.trade = new TradeManager();
    this.player = null;
    this.leaderboardData = [];
    this.setupResize();
  }

  setupResize() {
    const resize = () => {
      const container = this.canvas.parentElement;
      if (container) {
        this.canvas.style.width = container.clientWidth + 'px';
        this.canvas.style.height = container.clientHeight + 'px';
      }
    };
    window.addEventListener('resize', resize);
    resize();
  }

  async connectMultiplayer() {
    await Multiplayer.connect();
    this.isConnected = true;
    this.myPlayerIndex = Multiplayer.getMyPlayerIndex();

    if (!isSpectator) {
      Multiplayer.setDisplayName(currentUser.name);
      this.player = new Player(0, 0, this.myPlayerIndex);
      this.player.displayName = currentUser.name;
      this.player.isAdmin = currentUser.admin;
      // Give starting items: 3 random items
      const startItems = [];
      const shuffled = [...Array(20).keys()].sort(() => Math.random() - 0.5);
      for (let i = 0; i < 5; i++) startItems.push(shuffled[i]);
      this.player.items = startItems;
      this.player.score = startItems.reduce((s, id) => s + this.itemDb.getItem(id).value, 0);
      this.entities.push(this.player);
    }

    Multiplayer.onPlayerJoin((player) => {
      const rp = new RemotePlayer(player.playerIndex);
      rp.displayName = player.displayName || 'Player ' + player.playerIndex;
      rp.score = player.score || 0;
      rp.items = player.items || [];
      this.remotePlayers[player.id] = rp;
      this.entities.push(rp);
      this.updateWaitingOverlay();
      this.updatePlayerList();
      this.updateLeaderboard();
    });

    Multiplayer.onPlayerLeave((data) => {
      const rp = this.remotePlayers[data.id];
      if (rp) {
        const idx = this.entities.indexOf(rp);
        if (idx !== -1) this.entities.splice(idx, 1);
        delete this.remotePlayers[data.id];
      }
      if (this.trade.active && this.trade.partnerId === data.id) {
        this.trade.reset();
        this.hideTradeUI();
      }
      this.updatePlayerList();
      this.updateLeaderboard();
    });

    Multiplayer.on('playerUpdate', (data) => {
      const rp = this.remotePlayers[data.id];
      if (rp) {
        if (data.displayName) rp.displayName = data.displayName;
        if (data.score != null) rp.score = data.score;
        if (data.items) rp.items = data.items;
        if (data.isAdmin != null) rp.isAdmin = data.isAdmin;
      }
      this.updateLeaderboard();
    });

    Multiplayer.onMessage('tradeRequest', (data) => {
      if (isSpectator) return;
      if (data.from === Multiplayer.getMyId()) return;
      if (data.targetId !== Multiplayer.getMyId()) return;
      if (this.trade.active) return;
      if (confirm(data.fromName + ' wants to trade with you! Accept?')) {
        this.trade.active = true;
        this.trade.partnerId = data.from;
        this.trade.partnerName = data.fromName;
        Multiplayer.sendMessage('tradeAccepted', { targetId: data.from });
        this.showTradeUI();
      } else {
        Multiplayer.sendMessage('tradeDeclined', { targetId: data.from });
      }
    });

    Multiplayer.onMessage('tradeAccepted', (data) => {
      if (data.from === Multiplayer.getMyId()) return;
      if (data.targetId !== Multiplayer.getMyId()) return;
      this.trade.active = true;
      this.showTradeUI();
    });

    Multiplayer.onMessage('tradeDeclined', (data) => {
      if (data.from === Multiplayer.getMyId()) return;
      if (data.targetId !== Multiplayer.getMyId()) return;
      this.trade.reset();
      alert('Trade declined.');
    });

    Multiplayer.onMessage('tradeAddItem', (data) => {
      if (data.from === Multiplayer.getMyId()) return;
      if (!this.trade.active || data.from !== this.trade.partnerId) return;
      this.trade.theirOffer.push(data.itemId);
      this.trade.theirAccepted = false;
      this.trade.myAccepted = false;
      this.renderTradeUI();
    });

    Multiplayer.onMessage('tradeAcceptToggle', (data) => {
      if (data.from === Multiplayer.getMyId()) return;
      if (!this.trade.active || data.from !== this.trade.partnerId) return;
      this.trade.theirAccepted = data.accepted;
      if (this.trade.myAccepted && this.trade.theirAccepted) {
        this.executeTrade();
      }
      this.renderTradeUI();
    });

    Multiplayer.onMessage('tradeCancel', (data) => {
      if (data.from === Multiplayer.getMyId()) return;
      if (!this.trade.active || data.from !== this.trade.partnerId) return;
      this.trade.reset();
      this.hideTradeUI();
      alert('Trade cancelled.');
    });

    this.updateWaitingOverlay();
    this.updatePlayerList();
    this.updateLeaderboard();
    this.updateMyInfo();
  }

  updateWaitingOverlay() {
    const overlay = document.getElementById('waiting-overlay');
    if (Multiplayer.getPlayerCount() >= 2 || isSpectator) {
      overlay.style.display = 'none';
    } else {
      overlay.style.display = 'flex';
      overlay.textContent = 'Waiting for other players…';
    }
  }

  updateLeaderboard() {
    const panel = document.getElementById('leaderboard-panel');
    let entries = [];
    if (this.player) {
      entries.push({ name: this.player.displayName, score: this.player.score, isMe: true });
    }
    for (const id in this.remotePlayers) {
      const rp = this.remotePlayers[id];
      entries.push({ name: rp.displayName, score: rp.score, isMe: false });
    }
    entries.sort((a, b) => b.score - a.score);
    let html = '<h3>🏆 Leaderboard</h3>';
    entries.forEach((e, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
      html += `<div class="lb-entry"><span class="lb-name">${medal} ${e.name}${e.isMe ? ' (You)' : ''}</span><span class="lb-score">${e.score}</span></div>`;
    });
    panel.innerHTML = html;
  }

  updatePlayerList() {
    const panel = document.getElementById('player-list-panel');
    let html = '<h3>👥 Online Players</h3>';
    if (isSpectator) {
      html += '<div style="color:#aaa;font-size:0.8rem;text-align:center">Spectating</div>';
    }
    for (const id in this.remotePlayers) {
      const rp = this.remotePlayers[id];
      if (!isSpectator) {
        html += `<div class="pl-entry" data-id="${id}">${rp.displayName}</div>`;
      } else {
        html += `<div class="pl-entry" style="cursor:default">${rp.displayName} - ${rp.score}pts</div>`;
      }
    }
    panel.innerHTML = html;
    if (!isSpectator) {
      panel.querySelectorAll('.pl-entry').forEach(el => {
        el.addEventListener('click', () => {
          const tid = el.dataset.id;
          if (this.trade.active) return;
          const rp = this.remotePlayers[tid];
          if (!rp) return;
          this.trade.partnerId = tid;
          this.trade.partnerName = rp.displayName;
          Multiplayer.sendMessage('tradeRequest', { targetId: tid, fromName: currentUser.name });
          alert('Trade request sent to ' + rp.displayName + '...');
        });
      });
    }
  }

  updateMyInfo() {
    if (!this.player) return;
    const panel = document.getElementById('my-info');
    let html = `<div class="mi-name">${this.player.displayName}${this.player.isAdmin ? ' 👑' : ''}</div>`;
    html += `<div class="mi-points">💰 ${this.player.score} points</div>`;
    html += '<div class="mi-items"><b>Your Items:</b><br>';
    this.player.items.forEach(id => {
      const item = this.itemDb.getItem(id);
      html += `${item.emoji} ${item.name}`;
      if (this.player.isAdmin) html += ` <span style="color:#e94560">(${item.value})</span>`;
      html += '<br>';
    });
    html += '</div>';
    panel.innerHTML = html;
  }

  showTradeUI() {
    const ui = document.getElementById('trade-ui');
    ui.style.display = 'flex';
    this.renderTradeUI();
  }

  hideTradeUI() {
    document.getElementById('trade-ui').style.display = 'none';
    document.getElementById('item-picker').style.display = 'none';
  }

  renderTradeUI() {
    const ui = document.getElementById('trade-ui');
    const isAdmin = this.player && this.player.isAdmin;
    let html = '';
    // Left side: my offer
    html += '<div class="trade-side left">';
    html += `<div class="side-label">${this.player ? this.player.displayName : 'You'}</div>`;
    html += '<div class="trade-items">';
    this.trade.myOffer.forEach(id => {
      const item = this.itemDb.getItem(id);
      html += `<div class="trade-item">${item.emoji} ${item.name}`;
      if (isAdmin) html += `<div class="ti-value">${item.value}pts</div>`;
      html += '</div>';
    });
    html += '</div>';
    if (this.trade.myAccepted) html += '<div class="accepted-label">✓ Accepted</div>';
    html += '<div class="trade-buttons">';
    html += '<button class="trade-btn btn-decline" id="t-decline">✕</button>';
    html += '<button class="trade-btn btn-add" id="t-add">+</button>';
    html += '<button class="trade-btn btn-accept" id="t-accept">✓</button>';
    html += '</div></div>';
    // Right side: their offer
    html += '<div class="trade-side">';
    html += `<div class="side-label">${this.trade.partnerName}</div>`;
    html += '<div class="trade-items">';
    this.trade.theirOffer.forEach(id => {
      const item = this.itemDb.getItem(id);
      html += `<div class="trade-item">${item.emoji} ${item.name}`;
      if (isAdmin) html += `<div class="ti-value">${item.value}pts</div>`;
      html += '</div>';
    });
    html += '</div>';
    if (this.trade.theirAccepted) html += '<div class="accepted-label">✓ Accepted</div>';
    html += '</div>';
    ui.innerHTML = html;

    document.getElementById('t-decline').addEventListener('click', () => {
      Multiplayer.sendMessage('tradeCancel', { targetId: this.trade.partnerId });
      this.trade.reset();
      this.hideTradeUI();
    });
    document.getElementById('t-add').addEventListener('click', () => {
      this.showItemPicker();
    });
    document.getElementById('t-accept').addEventListener('click', () => {
      this.trade.myAccepted = !this.trade.myAccepted;
      Multiplayer.sendMessage('tradeAcceptToggle', { targetId: this.trade.partnerId, accepted: this.trade.myAccepted });
      if (this.trade.myAccepted && this.trade.theirAccepted) {
        this.executeTrade();
      }
      this.renderTradeUI();
    });
  }

  showItemPicker() {
    const picker = document.getElementById('item-picker');
    picker.style.display = 'flex';
    const isAdmin = this.player && this.player.isAdmin;
    let html = '<div class="picker-box"><h3>Select an Item to Offer</h3><div class="picker-grid">';
    this.player.items.forEach(id => {
      const item = this.itemDb.getItem(id);
      const inOffer = this.trade.myOffer.includes(id);
      html += `<div class="picker-item${inOffer ? ' disabled' : ''}" data-id="${id}">${item.emoji}<br>${item.name}`;
      if (isAdmin) html += `<div class="pi-value">${item.value}pts</div>`;
      html += '</div>';
    });
    html += '</div><button class="picker-close" id="picker-close">Cancel</button></div>';
    picker.innerHTML = html;

    picker.querySelectorAll('.picker-item:not(.disabled)').forEach(el => {
      el.addEventListener('click', () => {
        const itemId = parseInt(el.dataset.id);
        this.trade.myOffer.push(itemId);
        this.trade.myAccepted = false;
        this.trade.theirAccepted = false;
        Multiplayer.sendMessage('tradeAddItem', { targetId: this.trade.partnerId, itemId });
        picker.style.display = 'none';
        this.renderTradeUI();
      });
    });
    document.getElementById('picker-close').addEventListener('click', () => {
      picker.style.display = 'none';
    });
  }

  executeTrade() {
    // Swap items
    const myGive = [...this.trade.myOffer];
    const theirGive = [...this.trade.theirOffer];
    // Remove my offered items
    myGive.forEach(id => {
      const idx = this.player.items.indexOf(id);
      if (idx !== -1) this.player.items.splice(idx, 1);
    });
    // Add their offered items
    theirGive.forEach(id => {
      this.player.items.push(id);
    });
    // Recalc score
    this.player.score = this.player.items.reduce((s, id) => s + this.itemDb.getItem(id).value, 0);
    this.trade.reset();
    this.hideTradeUI();
    this.updateMyInfo();
    this.updateLeaderboard();
    alert('Trade completed! 🎉');
  }

  screenToWorld(cx, cy) { return { x: cx + this.scrollX, y: cy + this.scrollY }; }
  worldToScreen(wx, wy) { return { x: wx - this.scrollX, y: wy - this.scrollY }; }
  getObjectAt(cx, cy) {
    const w = this.screenToWorld(cx, cy);
    for (const e of this.entities) {
      const b = e.getBounds();
      if (w.x >= b.x && w.x <= b.x + b.width && w.y >= b.y && w.y <= b.y + b.height) return e;
    }
    return null;
  }

  update(dt) {
    for (const e of this.entities) e.update(dt);
    if (this.isConnected && this.player) {
      Multiplayer.sendUpdate({
        displayName: this.player.displayName,
        score: this.player.score,
        items: this.player.items,
        isAdmin: this.player.isAdmin
      });
    }
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);
    // Italian flag stripes
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#009246';
    ctx.fillRect(0, 0, w/3, h);
    ctx.fillStyle = '#fff';
    ctx.fillRect(w/3, 0, w/3, h);
    ctx.fillStyle = '#ce2b37';
    ctx.fillRect(2*w/3, 0, w/3, h);
    ctx.globalAlpha = 1;
    // Title
    ctx.fillStyle = '#e94560';
    ctx.font = 'bold 60px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText('🇮🇹 Italian Brainrot Trading 🇮🇹', w/2, 100);
    ctx.font = '30px Segoe UI';
    ctx.fillStyle = '#aaa';
    if (isSpectator) {
      ctx.fillText('Spectating - Click a player name to view', w/2, 160);
    } else {
      ctx.fillText('Click a player in the list to start trading!', w/2, 160);
    }
    // Draw floating items animation
    const t = Date.now() / 1000;
    const items = this.itemDb.getAll();
    for (let i = 0; i < 20; i++) {
      const item = items[i];
      const ix = (w * 0.15) + (i % 5) * (w * 0.175);
      const iy = 300 + Math.floor(i / 5) * 220 + Math.sin(t + i) * 15;
      ctx.font = '60px serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.emoji, ix, iy);
      ctx.font = '18px Segoe UI';
      ctx.fillStyle = '#ddd';
      ctx.fillText(item.name, ix, iy + 35);
      if (currentUser && currentUser.admin) {
        ctx.fillStyle = '#e94560';
        ctx.font = '16px Segoe UI';
        ctx.fillText(item.value + ' pts', ix, iy + 55);
      }
      ctx.fillStyle = '#aaa';
    }
  }

  async start() {
    await this.connectMultiplayer();
    const gameLoop = (timestamp) => {
      const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
      this.lastTime = timestamp;
      this.update(dt);
      this.draw();
      if (this.frameCount === undefined) this.frameCount = 0;
      this.frameCount++;
      if (this.frameCount % 60 === 0) {
        this.updateMyInfo();
        this.updateLeaderboard();
        this.updatePlayerList();
      }
      requestAnimationFrame(gameLoop);
    };
    requestAnimationFrame(gameLoop);
  }
}
