import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header.tsx';
import Sidebar from './Sidebar.tsx';
import { useAuth } from '../contexts/AuthContext.tsx'; // Import useAuth
import StudentDashboard from '../pages/StudentDashboard.tsx'; // Import StudentDashboard for view mode
// Potentially import other student pages if needed for direct rendering in view mode
import styles from './Layout.module.css';

const Layout: React.FC = () => {
  const { isAdmin } = useAuth(); // Check if the user is an admin
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Add state for view mode, default to 'admin'
  const [viewMode, setViewMode] = useState<'admin' | 'student'>('admin');

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Function to toggle view mode, only available for admins
  const toggleViewMode = () => {
    if (isAdmin) {
      setViewMode(prevMode => (prevMode === 'admin' ? 'student' : 'admin'));
      // Close mobile sidebar when switching modes
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className={styles.appContainer}> {/* Overall container */}
      {/* Pass viewMode and toggleViewMode to Header */}
      <Header
        onToggleSidebar={toggleSidebar}
        viewMode={viewMode}
        isAdmin={isAdmin}
        onToggleViewMode={toggleViewMode}
      />
      <div className={styles.mainLayout}>
        {/* Pass viewMode and toggleViewMode to Sidebar */}
        <Sidebar
          className={isSidebarOpen ? styles.sidebarOpen : ''}
          onLinkClick={toggleSidebar}
          viewMode={viewMode}
          isAdmin={isAdmin}
          onToggleViewMode={toggleViewMode}
        />
        {/* Add overlay div, conditionally rendered and styled via CSS */}
        {isSidebarOpen && <div className={styles.overlay} onClick={toggleSidebar}></div>}
        <main className={styles.contentArea}> {/* Content area */}
          {/* Conditionally render based on viewMode */}
          {isAdmin && viewMode === 'student' ? (
            // Render Student Dashboard when admin is in student view mode
            <StudentDashboard />
          ) : (
            // Render the normal admin/student routes via Outlet otherwise
            <Outlet />
          )}
        </main>
      </div>
      {/* Add Footer component here later if needed */}
    </div>
  );
};

export default Layout;