import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AvatarProvider } from './context/AvatarContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AvatarProvider>
      <App />
    </AvatarProvider>
  </StrictMode>,
);
