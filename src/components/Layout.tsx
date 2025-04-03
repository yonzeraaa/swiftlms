import React, { useState } from 'react';
import { Outlet } from 'react-router-dom'; // Removed useNavigate, useLocation
import Header from './Header.tsx';
import Sidebar from './Sidebar.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';
// Removed unused StudentDashboard import
// Potentially import other student pages if needed for direct rendering in view mode
import styles from './Layout.module.css';

const Layout: React.FC = () => {
  // Removed unused navigate and location variables
  // Get necessary auth state, including the combined loading flags
  const { isAdmin, initialAuthCheckComplete, profileLoading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Removed viewMode state and related logic
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Removed toggleViewMode function

  return (
    <div className={styles.appContainer}>
      <Header
        onToggleSidebar={toggleSidebar}
        isAdmin={isAdmin} // Pass isAdmin
      />
      {/* Use combined loading state check */}
      {/* Use combined loading state check */}
      {(!initialAuthCheckComplete || profileLoading) ? (
        <div className={styles.loadingPlaceholder}>Loading User...</div>
      ) : (
        <div className={styles.mainLayout}>
          <Sidebar
            className={isSidebarOpen ? styles.sidebarOpen : ''}
            onLinkClick={toggleSidebar}
            isAdmin={isAdmin} // Pass isAdmin
          />
          {isSidebarOpen && <div className={styles.overlay} onClick={toggleSidebar}></div>}
          <main className={styles.contentArea}>
            <Outlet />
          </main>
        </div>
      )}
      {/* Add Footer component here later if needed */}
    </div>
  );
};

export default Layout;