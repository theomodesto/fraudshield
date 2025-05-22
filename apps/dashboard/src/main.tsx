import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, useRoutes } from 'react-router-dom';
import { routes } from './routes';
// import './index.css'; // Removed as App.tsx imports global styles

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