import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'; // Added forwardRef, useImperativeHandle
import { supabase } from '../services/supabaseClient.ts';
import styles from './UserList.module.css';

// Define interface for User Profile data from Supabase
interface UserProfile {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  email: string | null;
  role: string | null;
  account_status: string | null;
  created_at: string;
}

// Define the type for the exposed handle
export interface UserListHandle {
  refreshUsers: () => void;
}

// Wrap component with forwardRef
const UserList = forwardRef<UserListHandle>((_props, ref) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Define fetchUsers using useCallback
  const fetchUsers = useCallback(async () => {
    console.log('Fetching users...');
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('id, full_name, phone_number, email, role, account_status, created_at')
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
  }, []);

  // useEffect to call fetchUsers on component mount
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Expose the fetchUsers function via the ref handle
  useImperativeHandle(ref, () => ({
    refreshUsers() {
      fetchUsers();
    }
  }));

  // Function to handle status update
  const handleUpdateStatus = async (userId: string, currentStatus: string | null) => {
    const newStatus = currentStatus === 'active' ? 'frozen' : 'active';
    console.log(`Attempting to set status to ${newStatus} for user ${userId}`);
    try {
      const { error: functionError } = await supabase.functions.invoke('update-user-status', {
        body: { userId, newStatus },
      });
      if (functionError) {
        console.error("Update status function error:", functionError);
        let detailedError = functionError.message;
         try {
            const contextError = (functionError as any).context?.error;
            if (contextError?.message) detailedError = contextError.message;
         } catch (e) { /* Ignore */ }
        alert(`Error updating status: ${detailedError}`);
      } else {
        alert(`User status updated to ${newStatus}. Refreshing list...`);
        fetchUsers(); // Re-run the fetch function
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      alert('An unexpected error occurred while trying to update status.');
    }
  };

  // Function to handle password reset
  const handleResetPassword = async (userId: string) => {
    const newPassword = prompt("Digite a nova senha para este usuário (mínimo 6 caracteres):");
    if (!newPassword || newPassword.length < 6) {
      alert("Senha inválida ou muito curta. A senha não foi alterada.");
      return;
    }
    console.log(`Attempting to reset password for user ${userId}`);
    try {
      const { error: functionError } = await supabase.functions.invoke('reset-user-password', {
        body: { userId, newPassword },
      });
      if (functionError) {
        console.error("Reset password function error:", functionError);
        let detailedError = functionError.message;
         try {
            const contextError = (functionError as any).context?.error;
            if (contextError?.message) detailedError = contextError.message;
         } catch (e) { /* Ignore */ }
        alert(`Erro ao redefinir senha: ${detailedError}`);
      } else {
        alert(`Senha para o usuário ${userId} redefinida com sucesso.`);
      }
    } catch (err) {
      console.error("Failed to reset password:", err);
      alert('Ocorreu um erro inesperado ao tentar redefinir a senha.');
    }
  };

  // Function to handle user deletion
  const handleDeleteUser = async (userId: string, userEmail: string | null) => {
    if (!confirm(`Tem certeza que deseja excluir permanentemente o usuário ${userEmail ?? userId}? Esta ação não pode ser desfeita.`)) {
      return;
    }
    console.log(`Attempting to delete user ${userId}`);
    try {
      const { error: functionError } = await supabase.functions.invoke('delete-user', {
        body: { userId },
      });
      if (functionError) {
        console.error("Delete user function error:", functionError);
        let detailedError = functionError.message;
         try {
            const contextError = (functionError as any).context?.error;
            if (contextError?.message) detailedError = contextError.message;
         } catch (e) { /* Ignore */ }
        alert(`Erro ao excluir usuário: ${detailedError}`);
      } else {
        alert(`Usuário ${userEmail ?? userId} excluído com sucesso. Atualizando lista...`);
        fetchUsers(); // Refresh the list after deletion
      }
    } catch (err) {
      console.error("Failed to delete user:", err);
      alert('Ocorreu um erro inesperado ao tentar excluir o usuário.');
    }
  };

  // Render logic
  if (loading && users.length === 0) {
    return <div className={styles.loadingMessage}>Loading user list...</div>;
  }
  if (error) {
    return <div className={styles.errorMessage}>Error loading users: {error}</div>;
  }

  return (
    <div className={styles.userListContainer}>
      <h2>Usuários Cadastrados</h2>
      {loading && <p>Refreshing...</p>}
      {users.length === 0 && !loading ? (
        <p className={styles.noUsersMessage}>Nenhum usuário encontrado.</p>
      ) : (
        <table className={styles.userTable}>
          <thead>
            <tr>
              <th>Nome Completo</th>
              <th>Email</th>
              <th>Telefone</th>
              <th>Role</th>
              <th>Status</th>
              <th>Criado em</th>
              <th colSpan={3}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.full_name ?? 'N/A'}</td>
                <td>{user.email ?? 'N/A'}</td>
                <td>{user.phone_number ?? 'N/A'}</td>
                <td>{user.role === 'student' ? 'Aluno' : user.role === 'admin' ? 'Admin' : (user.role ?? 'N/A')}</td>
                <td>
                  <span className={user.account_status === 'frozen' ? styles.statusFrozen : styles.statusActive}>
                    {user.account_status ?? 'N/A'}
                  </span>
                </td>
                <td>{new Date(user.created_at).toLocaleString()}</td>
                <td> {/* Freeze/Unfreeze Button Cell */}
                  {user.role !== 'admin' && (
                    <button
                      onClick={() => handleUpdateStatus(user.id, user.account_status)}
                      className={user.account_status === 'frozen' ? styles.unfreezeButton : styles.freezeButton}
                      title={user.account_status === 'frozen' ? 'Reativar conta do usuário' : 'Congelar conta do usuário'}
                    >
                      {user.account_status === 'frozen' ? 'Reativar' : 'Congelar'}
                    </button>
                  )}
                </td>
                 <td> {/* Reset Password Button Cell */}
                  {user.role !== 'admin' && (
                     <button
                        onClick={() => handleResetPassword(user.id)}
                        className={styles.resetButton}
                        title="Redefinir senha do usuário"
                      >
                        Senha
                      </button>
                  )}
                 </td>
                 <td> {/* Delete Button Cell */}
                  {user.role !== 'admin' && (
                      <button
                        onClick={() => handleDeleteUser(user.id, user.email)}
                        className={styles.deleteButton}
                        title="Excluir usuário permanentemente"
                      >
                        Excluir
                      </button>
                  )}
                 </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}); // End of forwardRef

export default UserList;