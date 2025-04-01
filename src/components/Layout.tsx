import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header.tsx';
import Sidebar from './Sidebar.tsx'; // Import Sidebar
import styles from './Layout.module.css'; // Import Layout styles

const Layout: React.FC = () => {
  return (
    <div className={styles.appContainer}> {/* Overall container */}
      <Header />
      <div className={styles.mainLayout}> {/* Container for sidebar + content */}
        <Sidebar />
        <main className={styles.contentArea}> {/* Content area */}
          <Outlet /> {/* Renders the matched child route component */}
        </main>
      </div>
      {/* Add Footer component here later if needed */}
    </div>
  );
};

export default Layout;