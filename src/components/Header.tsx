import React from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import styles from './Header.module.css'; // Styles to be created

const Header: React.FC = () => {
  const { logout, user } = useAuth();

  return (
    <header className={styles.appHeader}>
      <div className={styles.container}>
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