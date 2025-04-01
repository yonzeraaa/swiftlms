import React, { useRef } from 'react'; // Import useRef
import { useAuth } from '../contexts/AuthContext.tsx';
import UserList, { UserListHandle } from '../components/UserList.tsx'; // Import handle type
import AddStudentForm from '../components/AddStudentForm.tsx';
// import styles from './AdminDashboard.module.css'; // REMOVED - Styles handled by Layout/Components
import styles from './AdminDashboard.module.css'; // Import styles

const AdminDashboard: React.FC = () => {
  const { logout } = useAuth();
  const userListRef = useRef<UserListHandle>(null); // Create a ref for UserList

  // Callback function to refresh the user list
  const handleStudentAdded = () => {
    userListRef.current?.refreshUsers();
  };

  return (
    // Container div removed - Layout provides structure and padding
    <>
      <h1>Painel do Administrador</h1>
      <p>Bem-vindo!</p>
      <hr />
      <AddStudentForm onStudentAdded={handleStudentAdded} /> {/* Pass callback */}
      <hr />
      <UserList ref={userListRef} /> {/* Assign ref */}
      {/* Logout button removed, now handled by Header */}
    </>
  );
};

export default AdminDashboard;