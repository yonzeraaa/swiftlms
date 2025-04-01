import React from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import UserList from '../components/UserList.tsx';
import AddStudentForm from '../components/AddStudentForm.tsx';
// import styles from './AdminDashboard.module.css'; // REMOVED - Styles handled by Layout/Components
import styles from './AdminDashboard.module.css'; // Import styles

const AdminDashboard: React.FC = () => {
  const { logout } = useAuth();

  return (
    // Container div removed - Layout provides structure and padding
    <>
      <h1>Painel do Administrador</h1>
      <p>Bem-vindo!</p>
      <hr />
      <AddStudentForm />
      <hr />
      <UserList />
      {/* Logout button removed, now handled by Header */}
    </>
  );
};

export default AdminDashboard;