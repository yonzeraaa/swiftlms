import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.tsx';
import styles from './Sidebar.module.css'; // Styles to be created

const Sidebar: React.FC = () => {
  const { isAdmin, isStudent } = useAuth();

  // Define links based on role
  let navLinks: { path: string; label: string }[] = [];

  if (isAdmin) {
    navLinks = [
      { path: '/admin', label: 'Visão Geral' }, // Link to main admin dashboard
      // TODO: Add more admin links later (e.g., /admin/users, /admin/courses)
      { path: '/admin/settings', label: 'Configurações (Admin)' }, // Placeholder
    ];
  } else if (isStudent) {
    navLinks = [
      { path: '/student', label: 'Meu Painel' }, // Link to main student dashboard
      { path: '/student/courses', label: 'Meus Cursos' }, // Placeholder
      { path: '/student/profile', label: 'Meu Perfil' }, // Placeholder
    ];
  }

  return (
    <aside className={styles.sidebar}>
      <nav>
        <ul>
          {navLinks.map((link) => (
            <li key={link.path}>
              <NavLink
                to={link.path}
                className={({ isActive }) =>
                  isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
                }
                // Use end prop for the main dashboard links to avoid partial matching
                end={link.path === '/admin' || link.path === '/student'}
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;