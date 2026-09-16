import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileShow, setMobileShow] = useState(false);

  useEffect(() => {
    // 1. Authenticate check: redirect to /login if token is missing
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate, location]);

  const handleToggleCollapse = () => {
    setIsCollapsed(prev => !prev);
  };

  const handleToggleMobile = () => {
    setMobileShow(prev => !prev);
  };

  const handleCloseMobile = () => {
    setMobileShow(false);
  };

  return (
    <div className="app-container">
      {/* Sidebar Panel */}
      <Sidebar 
        isCollapsed={isCollapsed} 
        mobileShow={mobileShow} 
        onToggleCollapse={handleToggleCollapse} 
        onCloseMobile={handleCloseMobile}
      />

      {/* Main Content Layout Wrapper */}
      <div className="main-wrapper">
        <Navbar 
          onToggleMobile={handleToggleMobile} 
        />
        
        {/* Scrollable page body */}
        <main className="content-container">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="app-footer">
          <div>
            &copy; {new Date().getFullYear()} Sistem Informasi Gadai (PawnHub CRM). All rights reserved.
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Layout;
