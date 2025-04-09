import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.tsx';
import styles from './Sidebar.module.css';

// Define props type to accept className and toggle function
interface SidebarProps {
  className?: string;
  onLinkClick?: () => void;
  isAdmin: boolean; // Keep isAdmin prop
}

// Destructure new props
const Sidebar: React.FC<SidebarProps> = ({ className, onLinkClick, isAdmin }) => {
  // No longer need isAdmin from useAuth
  const { isStudent } = useAuth(); // Still need isStudent for non-admin users

  // Define links based on role
  // Define student view links first, so it's available in the scope below
  // Removed studentViewLinks array, will use navLinks directly
  let navLinks: { path: string; label: string }[] = [];

  // Reverted link definition logic
  // Determine links based on actual role
  console.log('[Sidebar] Received isAdmin prop:', isAdmin); // Log the received prop value
  if (isAdmin) {
    navLinks = [
      { path: '/admin', label: 'Visão Geral' },
      { path: '/admin/students', label: 'Alunos' },
      { path: '/admin/courses', label: 'Cursos' },
      { path: '/admin/disciplines-bank', label: 'Disciplinas' },
      { path: '/admin/lessons-bank', label: 'Aulas' },
      { path: '/admin/tests', label: 'Testes' }, // ADDED: Link to manage tests
      // Add a link for admin to view student dashboard
      { path: '/student', label: 'Visualizar como Aluno' },
    ];
  } else if (isStudent) {
    navLinks = [
      { path: '/student', label: 'Meu Painel' },
      { path: '/student/courses', label: 'Meus Cursos' },
    ];
  }

  console.log('[Sidebar] Determined navLinks:', navLinks); // Log the final links array

  return (
    // Combine base sidebar class with the passed className
    <aside className={`${styles.sidebar} ${className || ''}`}>
      <nav>
        <ul>
          {/* Render links based on determined navLinks */}
          {navLinks.map((link) => (
            <li key={link.path}>
              <NavLink
                to={link.path}
                className={({ isActive }) =>
                  isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
                }
                // Adjust 'end' prop logic if needed, e.g., for root paths
                end={link.path === '/admin' || link.path === '/student'}
                onClick={onLinkClick}
              >
                {link.label}
              </NavLink>
            </li>
          ))}
          {/* Removed conditional rendering based on viewMode */}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;