import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, useRoutes } from 'react-router-dom';
import { routes } from './routes';
// Ensure global CSS (e.g., from app/globals.css) is imported, typically in App.tsx or here.
// If App.tsx already imports it, this line might not be needed.
// import '@/app/globals.css'; 

const AppWithRoutes = () => {
  const element = useRoutes(routes);
  return element;
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppWithRoutes />
    </BrowserRouter>
  </React.StrictMode>
); 