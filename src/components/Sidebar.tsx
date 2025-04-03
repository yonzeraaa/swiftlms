import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.tsx';
import styles from './Sidebar.module.css';

// Define props type to accept className and toggle function
interface SidebarProps {
  className?: string;
  onLinkClick?: () => void; // Function to call when a link is clicked (e.g., close sidebar)
  // Removed viewMode props
}

// Reverted destructuring
const Sidebar: React.FC<SidebarProps> = ({ className, onLinkClick }) => {
  // Get roles from useAuth again
  const { isAdmin, isStudent } = useAuth();

  // Define links based on role
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

          {/* Removed "View as Student" toggle button */}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;