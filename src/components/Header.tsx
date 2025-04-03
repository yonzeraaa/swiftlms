import React from 'react';
import { NavLink, useLocation } from 'react-router-dom'; // Import NavLink and useLocation
import { useAuth } from '../contexts/AuthContext.tsx';
import styles from './Header.module.css';

// Define props to accept the toggle function
interface HeaderProps {
  onToggleSidebar: () => void;
  isAdmin: boolean; // Keep isAdmin prop
}

// Destructure new props
const Header: React.FC<HeaderProps> = ({ onToggleSidebar, isAdmin }) => {
  const { logout, user } = useAuth();
  const location = useLocation(); // Get location

  return (
    <header className={styles.appHeader}>
      <div className={styles.container}>
        {/* Remove Hamburger Button */}
        {/* Add onClick to brand, potentially only active on mobile via CSS/JS logic if needed */}
        <div className={styles.brand} onClick={onToggleSidebar}>SwiftLMS</div>
        {user && ( // Show logout only if user is logged in
          <div className={styles.userInfo}>
            <span className={styles.userEmail}>{user.email}</span>
            {/* Show "Return to Admin" link if admin is on a student page */}
            {isAdmin && location.pathname.startsWith('/student') && (
              <NavLink to="/admin" className={styles.logoutButton}> {/* Use NavLink and same style */}
                Voltar ao Admin
              </NavLink>
            )}
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