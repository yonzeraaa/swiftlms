import React from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import UserList from '../components/UserList.tsx';
import AddStudentForm from '../components/AddStudentForm.tsx';
import styles from './AdminDashboard.module.css'; // Import styles

const AdminDashboard: React.FC = () => {
  const { logout } = useAuth();

  return (
    <div className={styles.adminContainer}> {/* Apply container style */}
      <h1>Painel do Administrador</h1>
      <p>Bem-vindo!</p>
      <hr />
      <AddStudentForm />
      <hr />
      <UserList />
      <hr style={{ marginTop: '20px' }}/>
      <button onClick={logout}>Logout</button>
    </div> // Closing tag for adminContainer
  );
};

export default AdminDashboard;