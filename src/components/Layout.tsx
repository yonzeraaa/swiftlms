import React, { useState } from 'react'; // Keep useState
import { Outlet } from 'react-router-dom'; // Remove useLocation
import Header from './Header.tsx';
import Sidebar from './Sidebar.tsx'; // Keep Sidebar import
// Removed unused imports: useAuth, StudentDashboard
import styles from './Layout.module.css'; // Keep Layout styles

const Layout: React.FC = () => {
  // Removed isAdmin check, location, viewMode state, and toggleViewMode function
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Keep sidebar state

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className={styles.appContainer}> {/* Overall container */}
      {/* Reverted Header props */}
      <Header onToggleSidebar={toggleSidebar} />
      <div className={styles.mainLayout}>
        {/* Reverted Sidebar props */}
        <Sidebar
          className={isSidebarOpen ? styles.sidebarOpen : ''}
          onLinkClick={toggleSidebar}
        />
        {/* Add overlay div, conditionally rendered and styled via CSS */}
        {isSidebarOpen && <div className={styles.overlay} onClick={toggleSidebar}></div>}
        <main className={styles.contentArea}> {/* Content area */}
          {/* Reverted conditional rendering, always render Outlet */}
          <Outlet />
        </main>
      </div>
      {/* Add Footer component here later if needed */}
    </div>
  );
};

export default Layout;