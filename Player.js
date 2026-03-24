class Player extends GameObject {
  constructor(x, y, playerIndex) {
    super(x, y, 64, 64);
    this.name = 'Player';
    this.playerIndex = playerIndex;
    this.score = 0;
    this.items = [];
    this.displayName = '';
    this.isAdmin = false;
  }
  update(dt) {}
  draw(ctx) {}
}
