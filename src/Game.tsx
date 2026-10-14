import React, { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import WebSocketInterceptor from './components/WebSocketInterceptor/WebSocketInterceptor';
import { ROUTE_PATTERNS, ROUTES } from './routes';

function Game(): ReactElement {
  return (
    <div className="App">
      <Routes>
        {/* Pathless layout keeps a single WebSocketInterceptor mounted across routes */}
        <Route element={<WebSocketInterceptor />}>
          <Route path={ROUTES.HOME} element={null} />
          <Route path={ROUTES.SHORTCUTS} element={null} />
          <Route path={ROUTES.SHORTCUT_NEW} element={null} />
          <Route path={ROUTE_PATTERNS.SHORTCUT_EDIT} element={null} />
        </Route>
        <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
      </Routes>
    </div>
  );
}

export default Game;
