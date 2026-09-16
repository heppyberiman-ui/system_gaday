import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Items from './pages/Items';
import Transactions from './pages/Transactions';
import Redeem from './pages/Redeem';
import Extend from './pages/Extend';
import CashFlow from './pages/CashFlow';
import Reports from './pages/Reports';
import Scan from './pages/Scan';
import Settings from './pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public auth route */}
        <Route path="/login" element={<Login />} />

        {/* Private app layouts */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          
          {/* Menu routes */}
          <Route path="customers" element={<Customers />} />
          <Route path="items" element={<Items />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="redeem" element={<Redeem />} />
          <Route path="extend" element={<Extend />} />
          <Route path="cashflow" element={<CashFlow />} />
          <Route path="reports" element={<Reports />} />
          <Route path="scan" element={<Scan />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
