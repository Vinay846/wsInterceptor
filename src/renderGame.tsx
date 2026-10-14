import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';

import './styles/main.css';

import Game from './Game';
import { store } from './store';
import { hydrateShortcuts } from './store/slices/shortcutSlice';
import { loadShortcutsOnce } from './utils/shortcutsApi';

const APP_STARTED_KEY = '__wsInterceptorAppStarted';

export default (): void => {
  const g = globalThis as typeof globalThis & { [APP_STARTED_KEY]?: boolean };
  if (g[APP_STARTED_KEY]) {
    return;
  }
  g[APP_STARTED_KEY] = true;

  // Single load site for shortcuts.json — one GET per page lifetime
  void loadShortcutsOnce()
    .then((shortcuts) => {
      store.dispatch(hydrateShortcuts(shortcuts));
    })
    .catch((err) => {
      console.error('Failed to load shortcuts.json:', err);
    });

  const root = createRoot(document.getElementById('root') as HTMLElement);
  root.render(
    <Provider store={store}>
      <BrowserRouter>
        <Game />
      </BrowserRouter>
    </Provider>
  );
};
