import React from 'react';
import { createRoot } from 'react-dom/client';
import '../app/globals.css';
import { VirtualOffice } from '../components/VirtualOffice';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <VirtualOffice />
  </React.StrictMode>,
);
