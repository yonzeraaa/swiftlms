import React, { useRef, useEffect } from 'react'; // Import useRef, useEffect
import { useAuth } from '../contexts/AuthContext.tsx';
import UserList, { UserListHandle } from '../components/UserList.tsx';
import AddStudentForm from '../components/AddStudentForm.tsx';
// import styles from './AdminDashboard.module.css'; // REMOVED - Styles handled by Layout/Components
import styles from './AdminStudentsPage.module.css'; // Update style import path

const AdminStudentsPage: React.FC = () => { // Rename component
  const { logout } = useAuth();
  const userListRef = useRef<UserListHandle>(null); // Create a ref for UserList

  // Callback function to refresh the user list
  const handleStudentAdded = () => {
    // Check if ref is current and method exists before calling
    if (userListRef.current?.refreshUsers) {
        userListRef.current.refreshUsers();
    }
  };

  // useEffect to trigger initial fetch for UserList
  useEffect(() => {
    // Ensure the ref is populated before calling refresh
    if (userListRef.current) {
      console.log('[AdminDashboard] Triggering initial user fetch.');
      userListRef.current.refreshUsers();
    }
  }, []); // Empty dependency array ensures it runs only once on mount

  return (
    <div className={styles.pageContainer}> {/* Use consistent class name */}
      <h1>Gerenciar Alunos</h1> {/* Update title */}
      {/* <p>Bem-vindo!</p> */} {/* Remove generic welcome */}
      <hr />
      <AddStudentForm onStudentAdded={handleStudentAdded} /> {/* Pass callback */}
      <hr />
      <UserList ref={userListRef} /> {/* Assign ref */}
      {/* Logout button removed, now handled by Header */}
    </div>
  );
};

export default AdminStudentsPage; // Update export