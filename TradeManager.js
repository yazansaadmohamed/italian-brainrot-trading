class TradeManager {
  constructor() {
    this.name = 'TradeManager';
    this.active = false;
    this.myOffer = [];
    this.theirOffer = [];
    this.myAccepted = false;
    this.theirAccepted = false;
    this.partnerId = null;
    this.partnerName = '';
  }
  reset() {
    this.active = false;
    this.myOffer = [];
    this.theirOffer = [];
    this.myAccepted = false;
    this.theirAccepted = false;
    this.partnerId = null;
    this.partnerName = '';
  }
}
