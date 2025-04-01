import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient.ts';
// import styles from './UserList.module.css'; // For styling later

// Define interface for User Profile data from Supabase
// Ensure this matches the actual table structure and potential nulls
interface UserProfile {
  id: string;
  email: string | null; // Email might be null in profiles table if not synced properly
  role: string | null;
  created_at: string; // Supabase returns ISO string
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
        // Fetch all profiles. RLS policy should allow this for admins.
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('id, email, role, created_at') // Select specific columns
          .order('created_at', { ascending: false }); // Optional: order by creation date

        if (fetchError) {
          throw fetchError;
        }

        // Ensure data is treated as UserProfile[]
        setUsers(data as UserProfile[] || []);

      } catch (err: any) {
        console.error("Error fetching users:", err);
        setError(err.message || 'Failed to fetch user list.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []); // Empty dependency array means this runs once on mount

  if (loading) {
    return <div>Loading user list...</div>; // TODO: Use a better loading indicator
  }

  if (error) {
    return <div style={{ color: 'red' }}>Error loading users: {error}</div>;
  }

  return (
    // TODO: Add CSS Modules for styling (e.g., className={styles.userListContainer})
    <div>
      <h2>Lista de Usuários</h2>
      {users.length === 0 ? (
        <p>Nenhum usuário encontrado.</p>
      ) : (
        // TODO: Style the table properly
        <table border={1} style={{ width: '100%', borderCollapse: 'collapse' }}>
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
    </div>
  );
};

export default UserList;