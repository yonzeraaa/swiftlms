import React from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import styles from './Header.module.css';

// Define props to accept the toggle function
interface HeaderProps {
  onToggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => { // Destructure prop
  const { logout, user } = useAuth();

  return (
    <header className={styles.appHeader}>
      <div className={styles.container}>
        {/* Hamburger Button - shown only on mobile via CSS */}
        <button className={styles.hamburgerButton} onClick={onToggleSidebar} aria-label="Toggle Menu">
          {/* Simple hamburger icon using spans */}
          <span></span>
          <span></span>
          <span></span>
        </button>
        <div className={styles.brand}>SwiftLMS</div>
        {user && ( // Show logout only if user is logged in
          <div className={styles.userInfo}>
            <span className={styles.userEmail}>{user.email}</span>
            <button onClick={logout} className={styles.logoutButton}>
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;