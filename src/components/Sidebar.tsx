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
  let navLinks: { path: string; label: string }[] = [];

  // Determine links based on admin status and view mode
  if (isAdmin) {
    if (viewMode === 'student') {
      // Admin viewing as student: Show student links
      navLinks = [
        // Use NavLink for consistency, but might not navigate correctly within Layout's conditional render
        // Consider using buttons that call a function to change the rendered component in Layout if needed
        { path: '#', label: 'Meu Painel (Visualização)' }, // Using '#' as placeholder path
        { path: '#', label: 'Meus Cursos (Visualização)' },
        // Add other relevant student links for testing if needed
      ];
    } else {
      // Admin viewing admin panel: Show admin links + toggle button
      navLinks = [
        { path: '/admin', label: 'Visão Geral' },
        { path: '/admin/students', label: 'Alunos' },
        { path: '/admin/courses', label: 'Cursos' },
        { path: '/admin/disciplines-bank', label: 'Banco de Disciplinas' },
        { path: '/admin/lessons-bank', label: 'Banco de Aulas' },
        // Add other admin links...
      ];
      // Note: The toggle button will be added separately below
    }
  } else if (isStudent) {
    // Regular student view
    navLinks = [
      { path: '/student', label: 'Meu Painel' },
      { path: '/student/courses', label: 'Meus Cursos' },
      // Add other student links...
    ];
  }

  return (
    // Combine base sidebar class with the passed className
    <aside className={`${styles.sidebar} ${className || ''}`}>
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
                onClick={onLinkClick} // Call the passed function on click
              >
                {link.label}
              </NavLink>
            </li>
          ))}

          {/* Add "View as Student" toggle button for admins in admin view mode */}
          {isAdmin && viewMode === 'admin' && (
            <li>
              {/* Use a button styled as a link */}
              <button onClick={onToggleViewMode} className={styles.navLink} style={{ background: 'none', border: 'none', color: 'inherit', width: '100%', textAlign: 'left', cursor: 'pointer', padding: '0.8rem 1.5rem', margin: '0.2rem 0.8rem' }}>
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