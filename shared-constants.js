// CommonJS module for server.js and pkg compatibility
const GAME_ID_UPDATE_FIELDS = [
  { key: 'game', field: 'id' },
  { key: 'timer', field: 'id' },
  { key: 'betsclosingsoon', field: 'game' },
  { key: 'betsclosed', field: 'game' },
  { key: 'betsopen', field: 'game' },
  { key: 'startDealing', field: 'game' },
  { key: 'cardinc', field: 'game' },
  { key: 'card', field: 'game' },
  { key: 'gameresult', field: 'id' },
  { key: 'gameresult', field: 'gameId' },
  { key: 'winners', field: 'gId' },
  { key: 'win', field: 'gameId' },
  { key: 'peelTimer', field: 'gameId' },
  { key: 'peelTimeOpen', field: 'game' },
  { key: 'peelTimeClosed', field: 'game' },
  { key: 'cardRevealed', field: 'gameId' },
  { key: 'remove_card', field: 'game' },
];

module.exports = {
  GAME_ID_UPDATE_FIELDS
};