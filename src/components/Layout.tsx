import React, { useState } from 'react'; // Import useState
import { Outlet } from 'react-router-dom';
import Header from './Header.tsx';
import Sidebar from './Sidebar.tsx'; // Import Sidebar
import styles from './Layout.module.css'; // Import Layout styles

const Layout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State for mobile sidebar

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className={styles.appContainer}> {/* Overall container */}
      <Header onToggleSidebar={toggleSidebar} /> {/* Pass toggle function */}
      <div className={styles.mainLayout}> {/* Container for sidebar + content */}
        {/* Conditionally apply 'sidebarOpen' class based on state */}
        <Sidebar className={isSidebarOpen ? styles.sidebarOpen : ''} onLinkClick={toggleSidebar} />
        {/* Add overlay div, conditionally rendered and styled via CSS */}
        {isSidebarOpen && <div className={styles.overlay} onClick={toggleSidebar}></div>}
        <main className={styles.contentArea}> {/* Content area */}
          <Outlet /> {/* Renders the matched child route component */}
        </main>
      </div>
      {/* Add Footer component here later if needed */}
    </div>
  );
};

export default Layout;