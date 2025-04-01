import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient.ts';
import styles from './UserList.module.css'; // Import styles

// Define interface for User Profile data from Supabase
interface UserProfile {
  id: string;
  email: string | null;
  role: string | null;
  created_at: string;
}

const UserList: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('id, email, role, created_at')
          .order('created_at', { ascending: false });

        if (fetchError) {
          throw fetchError;
        }
        setUsers(data as UserProfile[] || []);
      } catch (err: any) {
        console.error("Error fetching users:", err);
        setError(err.message || 'Failed to fetch user list.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (loading) {
    return <div className={styles.loadingMessage}>Loading user list...</div>;
  }

  if (error) {
    return <div className={styles.errorMessage}>Error loading users: {error}</div>;
  }

  return (
    <div className={styles.userListContainer}> {/* Apply container style */}
      <h2>Usuários Cadastrados</h2>
      {users.length === 0 ? (
        <p className={styles.noUsersMessage}>Nenhum usuário encontrado.</p>
      ) : (
        <table className={styles.userTable}> {/* Apply table style */}
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Criado em</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.email ?? 'N/A'}</td>
                <td>{user.role ?? 'N/A'}</td>
                <td>{new Date(user.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div> // Closing tag for userListContainer
  );
};

export default UserList;