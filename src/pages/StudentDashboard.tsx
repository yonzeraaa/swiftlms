import React from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import styles from './StudentDashboard.module.css'; // Import styles

const StudentDashboard: React.FC = () => {
  const { user, logout } = useAuth(); // Get user for welcome message

  return (
    <div className={styles.studentContainer}> {/* Apply container style */}
      <h1>Student Dashboard (Placeholder)</h1>
      {/* Display email if user object exists */}
      {user && <p>Bem-vindo, {user.email}!</p>}
      <h2>Meus Cursos</h2>
      <p>(Placeholder for course list)</p>
      <button onClick={logout}>Logout</button>
    </div> // Closing tag for studentContainer
  );
};

export default StudentDashboard;