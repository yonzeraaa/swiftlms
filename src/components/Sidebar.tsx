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
  // Define student view links outside the if block
  const studentViewLinks = [
    { label: 'Meu Painel (Visualização)' },
    { label: 'Meus Cursos (Visualização)' },
    // Add other relevant student links for testing if needed
  ];

  // Determine links based on admin status and view mode
  if (isAdmin) {
    if (viewMode === 'student') {
      // Admin viewing as student: Use the pre-defined studentViewLinks
      // navLinks remains empty as we render studentViewLinks directly below
      navLinks = [];
    } else {
      // Admin viewing admin panel: Show admin links + toggle button
      navLinks = [
        { path: '/admin', label: 'Visão Geral' },
        { path: '/admin/students', label: 'Alunos' },
        { path: '/admin/courses', label: 'Cursos' },
        { path: '/admin/disciplines-bank', label: 'Disciplinas' }, // Renamed
        { path: '/admin/lessons-bank', label: 'Aulas' }, // Renamed
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
          {/* Render normal NavLinks if not in student view mode */}
          {viewMode === 'admin' && navLinks.map((link) => (
            <li key={link.path}>
              <NavLink
                to={link.path}
                className={({ isActive }) =>
                  isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
                }
                end={link.path === '/admin' || link.path === '/student'}
                onClick={onLinkClick}
              >
                {link.label}
              </NavLink>
            </li>
          ))}

          {/* Render non-clickable links if admin is in student view mode */}
          {isAdmin && viewMode === 'student' && studentViewLinks.map((link) => (
            <li key={link.label}>
              {/* Use a div styled like a navLink but without navigation */}
              <div className={styles.navLink} style={{ cursor: 'default' }}>
                {link.label}
              </div>
            </li>
          ))}

          {/* Add "View as Student" toggle button for admins in admin view mode */}
          {isAdmin && viewMode === 'admin' && (
            <li>
              {/* Use a button styled as a link */}
              {/* Apply navLink class directly for consistent styling */}
              <button onClick={onToggleViewMode} className={styles.navLink} style={{ background: 'none', border: 'none', color: 'inherit', width: '100%', textAlign: 'left', cursor: 'pointer' }}> {/* Remove inline styles except essential resets */}
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