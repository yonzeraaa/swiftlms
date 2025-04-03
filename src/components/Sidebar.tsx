import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.tsx';
import styles from './Sidebar.module.css';

// Define props type to accept className and toggle function
interface SidebarProps {
  className?: string;
  onLinkClick?: () => void;
  // Add props for view mode
  viewMode: 'admin' | 'student';
  isAdmin: boolean;
  onToggleViewMode: () => void;
}

// Destructure new props
const Sidebar: React.FC<SidebarProps> = ({ className, onLinkClick, viewMode, isAdmin, onToggleViewMode }) => {
  // No longer need isAdmin from useAuth
  const { isStudent } = useAuth(); // Still need isStudent for non-admin users

  // Define links based on role
  // Define student view links first, so it's available in the scope below
  const studentViewLinks = [
    { label: 'Meu Painel (Visualização)' },
    { label: 'Meus Cursos (Visualização)' },
    // Add other relevant student links for testing if needed
  ];
  let navLinks: { path: string; label: string }[] = [];

  // Reverted link definition logic
  if (isAdmin) {
    navLinks = [
      { path: '/admin', label: 'Visão Geral' },
      { path: '/admin/students', label: 'Alunos' },
      { path: '/admin/courses', label: 'Cursos' },
      { path: '/admin/disciplines-bank', label: 'Disciplinas' }, // Renamed
      { path: '/admin/lessons-bank', label: 'Aulas' }, // Renamed
      // { path: '/admin/settings', label: 'Configurações (Admin)' },
    ];
  } else if (isStudent) { // isStudent check uses 'aluno' internally now
    navLinks = [
      { path: '/student', label: 'Meu Painel' }, // Link to main student dashboard
      { path: '/student/courses', label: 'Meus Cursos' }, // Placeholder
      // { path: '/student/profile', label: 'Meu Perfil' }, // Placeholder
    ];
  }

  return (
    // Combine base sidebar class with the passed className
    <aside className={`${styles.sidebar} ${className || ''}`}>
      <nav>
        <ul>
          {/* Render normal NavLinks if not in student view mode */}
          {viewMode === 'admin' && navLinks.map((link) => (
            <li key={link.path}>
              <NavLink
                to={link.path}
                className={({ isActive }) =>
                  isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
                }
                end={link.path === '/admin' || link.path === '/student'}
                onClick={onLinkClick} // Pass click handler for closing sidebar
              >
                {link.label}
              </NavLink>
            </li>
          ))} {/* End map for admin navLinks */}

          {/* Render non-clickable links if admin is in student view mode */}
          {isAdmin && viewMode === 'student' && studentViewLinks.map((link) => (
            <li key={link.label}>
              {/* Use a div styled like a navLink but without navigation */}
              <div className={styles.navLink} style={{ cursor: 'default' }}>
                {link.label}
              </div>
            </li>
          ))} {/* End map for studentViewLinks */}
          {/* Add "View as Student" toggle button for admins in admin view mode */}
          {isAdmin && viewMode === 'admin' && (
            <li>
              {/* Use a button styled as a link */}
              {/* Apply navLink class directly for consistent styling */}
              <button onClick={onToggleViewMode} className={styles.navLink}> {/* Removed all inline styles */}
                Visualizar como Aluno
              </button>
            </li>
          )}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;