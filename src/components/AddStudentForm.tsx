import React, { useState, FormEvent } from 'react';
import { supabase } from '../services/supabaseClient.ts'; // Import supabase client
import styles from './AddStudentForm.module.css'; // Import styles

interface AddStudentFormProps {
  // Props might be needed later, e.g., a callback on successful add
  onStudentAdded?: () => void; // Optional callback
}

const AddStudentForm: React.FC<AddStudentFormProps> = ({ onStudentAdded }) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>(''); // Add state for full name
  const [phoneNumber, setPhoneNumber] = useState<string>(''); // Add state for phone number
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      // Invoke the deployed Edge Function
      console.log('Invoking create-user function with:', { email }); // Log before invoke
      const { data, error: functionError } = await supabase.functions.invoke('create-user', {
        body: { email, password, fullName, phoneNumber }, // Pass all fields
      });
      console.log('Function invoke response:', { data, functionError }); // Log response

      if (functionError) {
        // Handle errors thrown by the function itself
        console.error("Edge function invocation error:", functionError);
        // Just use the main functionError message for now
        setError(functionError.message || 'Falha ao invocar a função de criação.');
      } else if (data?.error) { // Check for errors returned in the function's JSON response
         console.error("Error returned from Edge function:", data.error);
         setError(data.error || 'Erro retornado pela função de criação.');
         // Don't throw here, let finally handle loading
      } else {
        // Success
        console.log("Edge function success response:", data);
        setSuccessMessage(data?.message || `Aluno "${email}" adicionado com sucesso.`);
        setEmail(''); // Clear form on success
        setPassword('');
        setFullName(''); // Clear new fields on success
        setPhoneNumber('');
        if (onStudentAdded) {
          onStudentAdded(); // Call the callback if provided
        }
      }
    } catch (err: any) {
      // Catch errors from the invoke call itself (e.g., network errors)
      console.error("Failed to add student (catch block):", err);
      // Set error only if not already set by functionError or data.error checks
      if (!error && !successMessage) {
          setError(err.message || 'Falha na comunicação ao adicionar aluno.');
      }
    } finally {
      // This block runs regardless of success or error in try/catch
      setLoading(false);
      console.log('Finished handleSubmit, loading set to false');
    }
  }; // End of handleSubmit

  return (
    <div className={styles.formContainer}> {/* Apply container style */}
      <h2>Adicionar Novo Aluno</h2>
      <form onSubmit={handleSubmit}>
        <div className={styles.inputGroup}>
          <label htmlFor="new-student-fullname">Nome Completo:</label>
          <input
            type="text"
            id="new-student-fullname"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required // Make full name required
            disabled={loading}
            placeholder="Nome completo do aluno"
          />
        </div>
        <div className={styles.inputGroup}>
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
        <div className={styles.inputGroup}>
          <label htmlFor="new-student-phone">Telefone (Opcional):</label>
          <input
            type="tel" // Use type="tel" for phone numbers
            id="new-student-phone"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            disabled={loading}
            placeholder="(XX) XXXXX-XXXX"
          />
        </div>
        <div className={styles.inputGroup}>
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
      {/* Note removed as function is now implemented */}
    </div> // Closing tag for formContainer
  );
}; // End of AddStudentForm component

export default AddStudentForm;