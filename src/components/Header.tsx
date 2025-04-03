import React from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import styles from './Header.module.css';

// Define props to accept the toggle function
interface HeaderProps {
  onToggleSidebar: () => void;
  // Add props for view mode toggle
  viewMode: 'admin' | 'student';
  isAdmin: boolean;
  onToggleViewMode: () => void;
}

// Destructure new props
const Header: React.FC<HeaderProps> = ({ onToggleSidebar, viewMode, isAdmin, onToggleViewMode }) => {
  const { logout, user } = useAuth();

  return (
    <header className={styles.appHeader}>
      <div className={styles.container}>
        {/* Remove Hamburger Button */}
        {/* Add onClick to brand, potentially only active on mobile via CSS/JS logic if needed */}
        <div className={styles.brand} onClick={onToggleSidebar}>SwiftLMS</div>
        {user && ( // Show logout only if user is logged in
          <div className={styles.userInfo}>
            {/* Show "Return to Admin" button if admin is in student view mode */}
            {isAdmin && viewMode === 'student' && (
              <button onClick={onToggleViewMode} className={styles.logoutButton} style={{ marginRight: '10px', borderColor: 'var(--color-info)' }}>
                Voltar ao Admin
              </button>
            )}
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