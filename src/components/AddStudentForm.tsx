import React, { useState, FormEvent } from 'react';
import styles from './AddStudentForm.module.css'; // Import styles

interface AddStudentFormProps {
  // Props might be needed later, e.g., a callback on successful add
}

const AddStudentForm: React.FC<AddStudentFormProps> = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    // --- IMPORTANT ---
    // As per the plan, direct user creation from the frontend using admin
    // privileges is insecure. This form currently only collects data.
    // The actual creation should happen via:
    // 1. A Supabase Edge Function (recommended).
    // 2. Manually by the admin in the Supabase dashboard.
    //
    // This placeholder simulates a successful UI interaction for now.
    console.log('Simulating Add Student:', { email, password });
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate success (replace with actual logic later)
    setSuccessMessage(`Aluno "${email}" adicionado (simulado).`);
    setEmail('');
    setPassword('');
    // --- End of Simulation ---

    /*
    // Example of how it *might* look with an Edge Function call (pseudo-code):
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: { email, password, role: 'student' },
      });
      if (error) throw error;
      setSuccessMessage(`Aluno "${email}" adicionado com sucesso.`);
      setEmail('');
      setPassword('');
    } catch (err: any) {
      console.error("Failed to add student:", err);
      setError(err.message || 'Falha ao adicionar aluno.');
    } finally {
      setLoading(false);
    }
    */
   setLoading(false); // Make sure loading is set to false in simulation
  };

  return (
    <div className={styles.formContainer}> {/* Apply container style */}
      <h2>Adicionar Novo Aluno</h2>
      <form onSubmit={handleSubmit}>
        <div className={styles.inputGroup}> {/* Apply input group style */}
          <label htmlFor="new-student-email">Email do Aluno:</label>
          <input
            type="email"
            id="new-student-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            placeholder="novo.aluno@email.com"
          />
        </div>
        <div className={styles.inputGroup}> {/* Apply input group style */}
          <label htmlFor="new-student-password">Senha Inicial:</label>
          <input
            type="password"
            id="new-student-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            disabled={loading}
            placeholder="Mínimo 6 caracteres"
          />
        </div>
        {error && <p className={styles.errorMessage}>{error}</p>} {/* Apply error style */}
        {successMessage && <p className={styles.successMessage}>{successMessage}</p>} {/* Apply success style */}
        <button type="submit" disabled={loading} className={styles.submitButton}> {/* Apply button style */}
          {loading ? 'Adicionando...' : 'Adicionar Aluno'}
        </button>
      </form>
      <p className={styles.note}> {/* Apply note style */}
        Nota: A criação real de usuários requer configuração adicional (Função Edge) ou ação manual no Supabase.
      </p>
    </div>
  );
};

export default AddStudentForm;