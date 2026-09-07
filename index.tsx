import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import './app/bootstrap/styles';
import { clearLocalRuntimeCaches } from './app/bootstrap/localRuntime';
import { AppProviders } from './app/providers';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

clearLocalRuntimeCaches();

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>,
);
