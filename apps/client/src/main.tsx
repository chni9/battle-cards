import '@fontsource/cinzel/600.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/outfit/400.css';
import '@fontsource/outfit/600.css';
import '@fontsource/outfit/700.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { applyCardthagoSkinToDocument, readCardthagoSkin } from './design/cardthago-skin';
import { App } from './App';
import './cardthago/cardthago-skins.css';
import './index.css';

applyCardthagoSkinToDocument(readCardthagoSkin());

const container = document.getElementById('root');
if (!container) {
  throw new Error('Missing #root element in index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
