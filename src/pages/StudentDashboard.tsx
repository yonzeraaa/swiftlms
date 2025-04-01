import React from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
// import styles from './StudentDashboard.module.css'; // REMOVED - Styles handled by Layout/Components

const StudentDashboard: React.FC = () => {
  const { user, logout } = useAuth(); // Get user for welcome message

  return (
    // Container div removed - Layout provides structure and padding
    <>
      <h1>Student Dashboard (Placeholder)</h1>
      {/* Display email if user object exists */}
      {user && <p>Bem-vindo, {user.email}!</p>}
      <h2>Meus Cursos</h2>
      <p>(Placeholder for course list)</p>
      {/* Logout button removed, now handled by Header */}
    </>
  );
};

export default StudentDashboard;