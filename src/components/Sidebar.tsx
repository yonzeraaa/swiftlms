import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.tsx';
import styles from './Sidebar.module.css';

// Define props type to accept className and toggle function
interface SidebarProps {
  className?: string;
  onLinkClick?: () => void; // Function to call when a link is clicked (e.g., close sidebar)
}

const Sidebar: React.FC<SidebarProps> = ({ className, onLinkClick }) => { // Destructure props
  const { isAdmin, isStudent } = useAuth();

  // Define links based on role
  let navLinks: { path: string; label: string }[] = [];

  if (isAdmin) {
    navLinks = [
      { path: '/admin', label: 'Visão Geral' }, // Keep overview link
      { path: '/admin/students', label: 'Alunos' }, // Add students link
      { path: '/admin/courses', label: 'Cursos' },
      { path: '/admin/disciplines-bank', label: 'Banco de Disciplinas' }, // Add link to discipline bank
      { path: '/admin/lessons-bank', label: 'Banco de Aulas' }, // Add link to lesson bank
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
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;