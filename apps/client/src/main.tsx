import '@fontsource/outfit/400.css';
import '@fontsource/outfit/600.css';
import '@fontsource/outfit/700.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import {
  applyVisualViewportCssVars,
  subscribeVisualViewport,
} from './design/components/visual-viewport';
import './index.css';

applyVisualViewportCssVars();
subscribeVisualViewport(applyVisualViewportCssVars);

const container = document.getElementById('root');
if (!container) {
  throw new Error('Missing #root element in index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
