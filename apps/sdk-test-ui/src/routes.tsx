import React from 'react';
import { RouteObject } from 'react-router-dom';
import App from './App';
import IndexPage from './pages/IndexPage';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <IndexPage /> },
    ],
  },
]; 