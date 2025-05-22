import React from 'react';
import { RouteObject } from 'react-router-dom';
import App from './App'; // The main app shell with layout
import IndexPage from './pages/index'; // Assuming pages/index.tsx exports the page component

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <IndexPage /> },
      // Add other child routes here, they will be rendered within App's <Outlet />
    ],
  },
  // You can add other top-level routes here if they don't use the main App layout
]; 