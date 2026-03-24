class RemotePlayer extends GameObject {
  constructor(playerIndex) {
    super(0, 0, 64, 64);
    this.name = 'RemotePlayer';
    this.playerIndex = playerIndex;
    this.targetX = 0;
    this.targetY = 0;
    this.score = 0;
    this.items = [];
    this.displayName = '';
    this.isAdmin = false;
  }
  update(dt) {
    this.x += (this.targetX - this.x) * 0.2;
    this.y += (this.targetY - this.y) * 0.2;
  }
  draw(ctx) {}
}
