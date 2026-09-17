import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';

// Code-split pages for lightning-fast loading
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Customers = lazy(() => import('./pages/Customers'));
const Items = lazy(() => import('./pages/Items'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Redeem = lazy(() => import('./pages/Redeem'));
const Extend = lazy(() => import('./pages/Extend'));
const CashFlow = lazy(() => import('./pages/CashFlow'));
const Reports = lazy(() => import('./pages/Reports'));
const Scan = lazy(() => import('./pages/Scan'));
const Settings = lazy(() => import('./pages/Settings'));

const PageLoader = () => (
  <div className="d-flex flex-column align-items-center justify-content-center py-5" style={{ minHeight: '50vh' }}>
    <div className="spinner-border text-primary mb-2" role="status" style={{ width: '2.5rem', height: '2.5rem' }}></div>
    <span className="text-muted small fw-semibold">Memuat halaman...</span>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
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
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
