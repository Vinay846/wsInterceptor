import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

import './styles/main.css';

import Game from './Game';
import { store } from './store';

export default (): void => {
  const root = createRoot(document.getElementById('root') as HTMLElement);
  root.render(
    <StrictMode>
      <Provider store={store}>
        <Game />
      </Provider>
    </StrictMode>
  );
};
