import './styles.less';

import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import { initI18n } from './i18n';

void initI18n().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
