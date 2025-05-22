import '@/app/globals.css'; // Adjusted path for CSS
import { Outlet } from 'react-router-dom';
import React from 'react';

export default function App() {
  return (
    <>
      <header className="bg-slate-800 text-white p-4">
        <h1 className="text-xl font-bold">FraudShield SDK Test UI</h1>
      </header>
      <main className="p-4">
        <Outlet />
      </main>
    </>
  );
} 