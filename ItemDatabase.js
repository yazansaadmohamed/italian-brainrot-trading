class ItemDatabase {
  constructor() {
    this.name = 'ItemDatabase';
    this.items = [
      { id: 0, name: '🤌 The Hand', emoji: '🤌', value: 50 },
      { id: 1, name: '👨‍🍳 Angry Chef', emoji: '👨‍🍳', value: 100 },
      { id: 2, name: '🗼 Leaning Tower of Pizza', emoji: '🍕', value: 250 },
      { id: 3, name: '🍝 Mama Mia Pasta', emoji: '🍝', value: 150 },
      { id: 4, name: '🛵 Roman Vespa', emoji: '🛵', value: 200 },
      { id: 5, name: '🎭 Venice Mask', emoji: '🎭', value: 300 },
      { id: 6, name: '⚽ Calcio Ball', emoji: '⚽', value: 75 },
      { id: 7, name: '🍷 Nonno\'s Wine', emoji: '🍷', value: 180 },
      { id: 8, name: '🧀 Parmigiano Chunk', emoji: '🧀', value: 120 },
      { id: 9, name: '🏛️ Colosseum Brick', emoji: '🏛️', value: 400 },
      { id: 10, name: '🤵 Mafia Don Hat', emoji: '🎩', value: 500 },
      { id: 11, name: '☕ Espresso Shot', emoji: '☕', value: 60 },
      { id: 12, name: '🍦 Gelato Cone', emoji: '🍦', value: 90 },
      { id: 13, name: '🫒 Sacred Olive', emoji: '🫒', value: 110 },
      { id: 14, name: '🎵 Opera Note', emoji: '🎵', value: 170 },
      { id: 15, name: '🏎️ Ferrari Key', emoji: '🏎️', value: 450 },
      { id: 16, name: '🌋 Vesuvius Ash', emoji: '🌋', value: 350 },
      { id: 17, name: '🐺 Romulus Wolf', emoji: '🐺', value: 275 },
      { id: 18, name: '💎 Medici Gem', emoji: '💎', value: 600 },
      { id: 19, name: '🗡️ Gladiator Sword', emoji: '🗡️', value: 380 }
    ];
  }
  getItem(id) { return this.items.find(i => i.id === id); }
  getAll() { return this.items; }
}
