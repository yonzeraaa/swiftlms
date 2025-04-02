import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'; // Removed unused 'React' import
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
  last_sign_in_at?: string | null; // Add last login (optional from auth.users)
}

// Define the type for the exposed handle
export interface UserListHandle {
  refreshUsers: () => void;
}

// Wrap component with forwardRef
const UserList = forwardRef<UserListHandle>((_props, ref) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(false); // Start loading false
  const [error, setError] = useState<string | null>(null);

  // Define fetchUsers using useCallback
  const fetchUsers = useCallback(async () => {
    // **** ADDED CHECK: Don't fetch if already loading ****
    if (loading) {
      console.log('[UserList] Fetch already in progress, skipping.');
      return;
    }
    console.log('[UserList] Fetching users...');
    setLoading(true); // Set loading true only when starting fetch
    setError(null);
    try {
      // **** ADDED: Explicit session check ****
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session) {
        console.error('[UserList] Error getting session or session is null:', sessionError);
        setError('Sessão inválida. Por favor, faça login novamente.');
        setLoading(false); // Ensure loading stops if session is invalid
        // Optionally trigger logout here if logout function is available
        return; // Stop fetching if session is invalid
      }
      console.log('[UserList] Session check successful, proceeding with fetch.');
      // **** END ADDED ****

      // **** MODIFIED: Invoke Edge Function ****
      const { data, error: functionError } = await supabase.functions.invoke('get-all-profiles', {
        // No body needed, auth token is passed via Supabase client automatically
      });
      // **** END MODIFIED ****

      if (functionError) {
         console.error('[UserList] Edge function invocation error:', functionError);
         throw functionError; // Throw the error to be caught by the catch block
      }
      console.log('[UserList] Edge function invocation successful.');
      console.log('[UserList] Raw data received from function:', data); // DEBUG: Log raw data
      // DEBUG: Check the first user object specifically
      if (Array.isArray(data) && data.length > 0) {
          console.log('[UserList] Checking first user object for last_sign_in_at:', data[0]);
          console.log('[UserList] Does first user have last_sign_in_at property?', data[0]?.hasOwnProperty('last_sign_in_at'));
          console.log('[UserList] Value of last_sign_in_at for first user:', data[0]?.last_sign_in_at);
      }
      // Remove type assertion to let TypeScript infer and potentially show errors
      setUsers(data || []);
    } catch (err: any) {
      console.error("[UserList] Error fetching users via Edge Function:", err);
      if (err?.message.includes('JWT') || err?.status === 401 || err?.message.includes('invalid claim')) {
        setError('Sessão inválida ou expirada. Por favor, faça login novamente.');
        console.warn("[UserList] Invalid session detected during fetch.");
      } else {
        setError(err.message || 'Failed to fetch user list.');
      }
    } finally {
      console.log('[UserList] Fetch finally block. Setting loading false.');
      setLoading(false);
    }
  }, []); // CORRECTED: Empty dependency array - fetch logic doesn't depend on loading state

  // --- ADDED BACK useEffect for initial fetch ---
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]); // fetchUsers dependency is stable due to useCallback

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
  // Display loading indicator based on loading state
  if (loading && users.length === 0) {
    return <div className={styles.loadingMessage}>Loading user list...</div>;
  }
  if (error) {
    return <div className={styles.errorMessage}>Error loading users: {error}</div>;
  }

  return (
    <div className={styles.userListContainer}>
      <h2>Usuários Cadastrados</h2>
      {/* Show refreshing indicator only when loading is true but users already exist */}
      {loading && users.length > 0 && <p>Refreshing...</p>}
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
              <th>Último Login</th> {/* Add new header */}
              <th colSpan={3}>Ações</th> {/* Keep colSpan as 3 */}
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                  <td data-label="Nome Completo">{user.full_name ?? 'N/A'}</td>
                  <td data-label="Email">{user.email ?? 'N/A'}</td>
                  <td data-label="Telefone">{user.phone_number ?? 'N/A'}</td>
                  <td data-label="Role">{user.role === 'aluno' ? 'Aluno' : user.role === 'admin' ? 'Admin' : (user.role ?? 'N/A')}</td>
                  <td data-label="Status"><span className={user.account_status === 'frozen' ? styles.statusFrozen : styles.statusActive}>{user.account_status ?? 'N/A'}</span></td>
                  <td data-label="Criado em">{new Date(user.created_at).toLocaleString()}</td>
                  <td data-label="Último Login">{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Nunca'}</td>
                  {/* Actions - Combine into one cell for mobile layout */}
                  <td data-label="Ações">
                      {user.role === 'aluno' && (
                          <>
                              <button onClick={() => handleUpdateStatus(user.id, user.account_status)} className={user.account_status === 'frozen' ? styles.unfreezeButton : styles.freezeButton} title={user.account_status === 'frozen' ? 'Reativar conta do usuário' : 'Congelar conta do usuário'}>
                                  {user.account_status === 'frozen' ? 'Reativar' : 'Congelar'}
                              </button>
                              <button onClick={() => handleResetPassword(user.id)} className={styles.resetButton} title="Redefinir senha do usuário">
                                  Senha
                              </button>
                              <button onClick={() => handleDeleteUser(user.id, user.email)} className={styles.deleteButton} title="Excluir usuário permanentemente">
                                  Excluir
                              </button>
                          </>
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