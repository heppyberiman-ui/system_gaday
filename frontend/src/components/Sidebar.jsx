import React from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar = ({ isCollapsed, mobileShow, onToggleCollapse, onCloseMobile }) => {
  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: 'bi-grid-1x2-fill' },
    { name: 'Customer', path: '/customers', icon: 'bi-people-fill' },
    { name: 'Barang', path: '/items', icon: 'bi-box-seam-fill' },
    { name: 'Transaksi Gadai', path: '/transactions', icon: 'bi-wallet2' },
    { name: 'Tebus Barang', path: '/redeem', icon: 'bi-arrow-left-right' },
    { name: 'Perpanjangan', path: '/extend', icon: 'bi-calendar-plus-fill' },
    { name: 'Kas', path: '/cashflow', icon: 'bi-cash-coin' },
    { name: 'Laporan', path: '/reports', icon: 'bi-graph-up-arrow' },
    { name: 'Smart Scan', path: '/scan', icon: 'bi-qr-code-scan' },
    { name: 'Pengaturan', path: '/settings', icon: 'bi-gear-fill' }
  ];

  return (
    <>
      {/* Mobile Backdrop overlay */}
      {mobileShow && (
        <div className="sidebar-backdrop d-lg-none" onClick={onCloseMobile}></div>
      )}

      <aside className={`app-sidebar ${isCollapsed ? 'collapsed' : ''} ${mobileShow ? 'show-mobile' : ''}`}>
        {/* Sidebar Header/Logo */}
        <div className="sidebar-header d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2 overflow-hidden">
            <div className="bg-primary text-white rounded-3 d-flex align-items-center justify-content-center" style={{ minWidth: '40px', height: '40px' }}>
              <i className="bi bi-bank2" style={{ fontSize: '1.25rem' }}></i>
            </div>
            {!isCollapsed && (
              <span className="fw-bold fs-5 text-white tracking-wider">Sistem Gadai</span>
            )}
          </div>
          {/* Collapse toggle button on Desktop */}
          <button 
            onClick={onToggleCollapse} 
            className="btn btn-sm btn-link text-white-50 border-0 p-1 d-none d-lg-inline-block"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            <i className={`bi ${isCollapsed ? 'bi-chevron-double-right' : 'bi-chevron-double-left'}`} style={{ fontSize: '1.2rem' }}></i>
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="sidebar-menu">
          {menuItems.map((item, idx) => (
            <NavLink 
              key={idx} 
              to={item.path} 
              onClick={onCloseMobile}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              title={isCollapsed ? item.name : ''}
            >
              <i className={`bi ${item.icon}`}></i>
              {!isCollapsed && <span>{item.name}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          {!isCollapsed ? (
            <div className="d-flex align-items-center gap-2 text-white-50 overflow-hidden">
              <i className="bi bi-person-circle fs-5"></i>
              <div className="text-truncate">
                <div className="fw-semibold text-white text-truncate" style={{ fontSize: '0.875rem' }}>Kasir Aktif</div>
                <div style={{ fontSize: '0.75rem' }}>PawnHub Operator</div>
              </div>
            </div>
          ) : (
            <div className="text-center text-white-50">
              <i className="bi bi-person-circle fs-4"></i>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
