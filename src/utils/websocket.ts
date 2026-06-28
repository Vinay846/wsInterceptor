import { API_URLS, GAME_ID_UPDATE_FIELDS } from '../constants';
import { MessageShortcut } from '../types';

export async function fetchTableConfig(jsessionId: string, tableId: string, env?: string | null): Promise<string> {
  const configUrl = API_URLS.TABLE_CONFIG(jsessionId, tableId, env ?? 'games');

  try {
    const response = await fetch(configUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    const json = await response.json();
    const wsAddress = json?.params?.ws_address;
    if (!wsAddress) {
      throw new Error('ws_address not found in config response');
    }

    return API_URLS.WEBSOCKET_PROXY(wsAddress, jsessionId, tableId);
  } catch (error: any) {
    throw error;
  }
}

export async function extractParamsFromUrl(fullUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const searchParams = new URL(fullUrl).searchParams;
    const JSESSIONID = searchParams.get('JSESSIONID');
    const TABLE_ID = searchParams.get('tableId');
    const ENV = searchParams.get('env');

    if (!JSESSIONID || !TABLE_ID) {
      reject('URL Parsing');
      return;
    }

    fetchTableConfig(JSESSIONID, TABLE_ID, ENV)
      .then((externalURL) => {
        resolve(externalURL);
      })
      .catch((err: any) => {
        reject('Table Config');
      });
  });
}

/**
 * Resolve the Env WebSocket URL to connect to.
 * - If an override URL is provided and is already a ws(s):// address, use it directly.
 * - If it contains JSESSIONID & tableId params (or is a page URL), derive via table config.
 * - Otherwise fall back to the current page URL params (original behavior).
 */
export async function resolveEnvWebSocketUrl(overrideUrl: string, fallbackHref: string): Promise<string> {
  const trimmed = (overrideUrl || '').trim();

  if (trimmed) {
    if (/^wss?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    // Treat as a URL containing connection params (JSESSIONID, tableId, env)
    return extractParamsFromUrl(trimmed);
  }

  return extractParamsFromUrl(fallbackHref);
}

export function generateRandomGameId(): string {
  return Math.floor(Math.random() * 9000000000) + 1000000000 + '';
}

export function updateShortcutGameIds(shortcut: MessageShortcut, newGameId: string): MessageShortcut {
  const updatedMessages = shortcut.messages.map((message) => {
    try {
      const content = JSON.parse(message.content);
      let updated = false;

      GAME_ID_UPDATE_FIELDS.forEach(({ key, field }) => {
        if (message.messageKey === key && content[field]) {
          content[field] = newGameId;
          updated = true;
        }
      });

      return updated
        ? {
          ...message,
          content: JSON.stringify(content, null, 2),
        }
        : message;
    } catch (error) {
      return message;
    }
  });

  return {
    ...shortcut,
    messages: updatedMessages,
  };
}

export function isValidJSON(content: string): boolean {
  try {
    JSON.parse(content);
    return true;
  } catch {
    return false;
  }
}

export function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString();
}

export function truncateMessage(message: string, maxLength: number = 100): string {
  return message.length > maxLength ? message.substring(0, maxLength) + '...' : message;
}
