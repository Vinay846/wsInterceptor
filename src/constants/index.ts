import { CardSuit, CardRank, MessageType, ResponsesData } from '../types';

// Type for game ID update fields
interface GameIdUpdateField {
  key: string;
  field: string;
}

// API URLs — same-origin relative paths (Vite proxies these in dev; Express serves them in prod)
const API_BASE = '';
export const API_URLS = {
  DEV_WEBSOCKET: 'ws://localhost:8084',
  DATA_ENDPOINT: `${API_BASE}/data`,
  SHORTCUTS: `${API_BASE}/api/shortcuts`,
  UPDATE_GAME_IDS: `${API_BASE}/update-game-ids`,
  SAVE_COLLECTED_DATA: `${API_BASE}/save-collected-data`,
  // Data file management & configuration
  FILES: `${API_BASE}/files`,
  FILE_BY_NAME: (fileName: string) => `${API_BASE}/files/${encodeURIComponent(fileName)}`,
  ACTIVE_FILE: `${API_BASE}/active-file`,
  INITIAL_KEYS: `${API_BASE}/config/initial-keys`,
  UPDATE_MESSAGE: `${API_BASE}/update-message`,
  DELETE_MESSAGE: (key: string) => `${API_BASE}/message/${encodeURIComponent(key)}`,
  PROXY_BASE: '',
  TABLE_CONFIG: (jsessionId: string, tableId: string, env: string = 'games') => 
    `https://${env}.pragmaticplaylive.net/api/ui/tableConfig?JSESSIONID=${jsessionId}&tableId=${tableId}&operatorNotification=true`,
  WEBSOCKET_PROXY: (wsAddress: string, jsessionId: string, tableId: string) =>
    `${wsAddress}?JSESSIONID=${jsessionId}&tableId=${tableId}&type=json`
} as const;

// Card Configuration
export const CARD_SUITS: CardSuit[] = [
  { name: 'Hearts', symbol: '♥', initial: 'H', color: '#e74c3c' },
  { name: 'Diamonds', symbol: '♦', initial: 'D', color: '#e74c3c' },
  { name: 'Clubs', symbol: '♣', initial: 'C', color: '#2c3e50' },
  { name: 'Spades', symbol: '♠', initial: 'S', color: '#2c3e50' },
];

export const CARD_RANKS: CardRank[] = [
  { name: 'Ace', symbol: 'A', value: 1, cardValue: 1 },
  { name: '2', symbol: '2', value: 2, cardValue: 2 },
  { name: '3', symbol: '3', value: 3, cardValue: 3 },
  { name: '4', symbol: '4', value: 4, cardValue: 4 },
  { name: '5', symbol: '5', value: 5, cardValue: 5 },
  { name: '6', symbol: '6', value: 6, cardValue: 6 },
  { name: '7', symbol: '7', value: 7, cardValue: 7 },
  { name: '8', symbol: '8', value: 8, cardValue: 8 },
  { name: '9', symbol: '9', value: 9, cardValue: 9 },
  { name: '10', symbol: '10', value: 10, cardValue: 0 },
  { name: 'Jack', symbol: 'J', value: 11, cardValue: 0 },
  { name: 'Queen', symbol: 'Q', value: 12, cardValue: 0 },
  { name: 'King', symbol: 'K', value: 13, cardValue: 0 },
];

// Message Types
export const MESSAGE_TYPES: MessageType[] = [
  { key: 'table', label: 'TBL', level: 1, title: 'Table Info' },
  { key: 'dealer', label: 'DLR', level: 2, title: 'Dealer Info' },
  { key: 'game', label: 'GAM', level: 3, title: 'Game State' },
  { key: 'timer', label: 'TMR', level: 4, title: 'Timer' },
  { key: 'betstats', label: 'BET', level: 5, title: 'Bet Statistics' },
  { key: 'card', label: 'CRD', level: 6, title: 'Card Dealt' },
  { key: 'gameresult', label: 'RST', level: 7, title: 'Game Result' },
  { key: 'winners', label: 'WIN', level: 8, title: 'Winners', special: true },
];

// Initial Response Data
export const INITIAL_RESPONSES_DATA: ResponsesData = {
  table: {
    newTable: 'false',
    openTime: '',
    table: 'ne074fgn4bd1150i',
    seq: 1,
    value: 'BC15.3',
  },
  dealer: {
    id: 'cmp8q1pspi7ik4vy',
    table: 'ne074fgn4bd1150i',
    seq: 2,
    value: 'Atarah',
  },
  game: {
    id: '9194335023',
    starttime: '1753195111190',
    table: 'ne074fgn4bd1150i',
    seq: 112,
    value: '14:38:31',
  },
  timer: {
    id: '9194335023',
    table: 'ne074fgn4bd1150i',
    seq: 113,
    value: '17',
  },
  betstats: {
    table: 'ne074fgn4bd1150i',
    seq: 170,
    tietotal: '1.2',
    tiepercentage: '0.0',
    tiecount: '1',
    totalBetscount: '43',
    bankertotal: '304.35417391725076',
    bankerpercentage: '61.0',
    bankercount: '30',
    playertotal: '194.43129207030563',
    playerpercentage: '39.0',
    playercount: '11',
  },
  card: {
    sc: '0H1',
    game: '9194335023',
    cardCount: '0',
    place: 'player',
    table: 'ne074fgn4bd1150i',
    seq: 179,
    value: '34',
  },
  gameresult: {
    pp: '0.0',
    bb: '0.0',
    gameType: 'baccarat6',
    perfectPair: 'false',
    banker_pair: 'false',
    code: '0',
    bighand: 'false',
    bg: '0.0',
    player_pair: 'false',
    bp: '0.0',
    result: 'player',
    score: '9',
    bnc: '0.0',
    sm: '2.5',
    id: '9194328323',
    table: 'ne074fgn4bd1150i',
    eitherPair: 'false',
    gameId: '9194328323',
    b: '0.0',
    s6: '0.0',
    natural: 'true',
    playerBonus: 'true',
    pnc: '2.0',
    ep: '0.0',
    bankerBonus: 'false',
    prp: '0.0',
    p: '2.0',
    pb: '2.0',
    t: '0.0',
    super6: 'false',
    time: '14:38:02',
    smallhand: 'true',
    seq: 90,
    value: 'player',
  },
  winners: {
    gId: '9194328323',
    totalEur: '52.19',
    winnersCount: '45',
    table: 'ne074fgn4bd1150i',
    seq: 97,
    winner: [
      {
        megawin: 'false',
        currency: 'EUR',
        screenName: 'Spdooop',
        userId: 'ppc1703164701821',
        win: '12.46',
      },
    ],
  },
};

// Game ID Update Fields - must match server's shared-constants.js
export const GAME_ID_UPDATE_FIELDS: readonly GameIdUpdateField[] = [
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

// Initial Keys for WebSocket Broadcasting
export const INITIAL_BROADCAST_KEYS = [
  'table',
  'dealer',
  'game',
  'disablesidebets',
  'ShoeSummary',
  'statistic',
  'subscribe',
] as const;

// WebSocket System Message Types
export const SYSTEM_MESSAGE_TYPES = [
  'bridge_mode_toggle',
  'client_identification',
  'bridge_status',
  'bridge_mode_confirmed',
  'identification_confirmed',
  'bridge_mode_status',
  'error'
] as const;

// Sentinel value used in the message-key dropdown to trigger "add new message" mode
export const ADD_NEW_MESSAGE_KEY = '__add_new_message__';

// Default recording triggers (message keys that start/stop a round capture)
export const DEFAULT_RECORD_START_KEY = 'game';
export const DEFAULT_RECORD_STOP_KEY = 'winners';

// LocalStorage Keys
export const STORAGE_KEYS = {
  SHORTCUTS: 'websocket-shortcuts',
  ENV_URL: 'websocket-env-url',
  RECORDING: 'websocket-recording-config',
} as const;

// Timing Constants
export const TIMING = {
  TOAST_DURATION: 3000,
  SHORTCUT_MESSAGE_DELAY: 300,
  ROUND_COMPLETE_DELAY: 2000,
  INITIAL_DATA_DELAY: 500,
  RECONNECT_DELAY: 200,
} as const;