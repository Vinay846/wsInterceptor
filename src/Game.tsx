import React, { ReactElement } from 'react';

import WebSocketInterceptor from './components/WebSocketInterceptor/WebSocketInterceptor';

function Game(): ReactElement {
  return (
    <div className="App">
      <WebSocketInterceptor />
    </div>
  );
}

export default Game;
