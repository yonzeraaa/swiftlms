import React, { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import styles from './LoginPage.module.css'; // Import the CSS module
// import styles from './LoginPage.module.css'; // We'll add styling later

const LoginPage: React.FC = () => {
  const { login, rememberedCredentials, profileLoading: authLoading } = useAuth(); // Use profileLoading aliased as authLoading
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false); // Form-specific loading

  // Pre-fill fields if credentials were remembered
  useEffect(() => {
    if (rememberedCredentials.email) {
      setEmail(rememberedCredentials.email);
      // SECURITY NOTE: Pre-filling password based on localStorage value
      setPassword(rememberedCredentials.password || '');
      setRememberMe(true); // Assume if email is remembered, checkbox was checked
    }
  }, [rememberedCredentials]);

  const handleForgotPassword = () => {
    // As per requirements, just show a message
    alert('Entre em contato com um administrador para redefinir sua senha.');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null); // Clear previous errors
    setLoading(true);

    try {
      await login(email, password, rememberMe);
      // Navigation is handled by the routing logic in App.tsx based on auth state change
    } catch (err: any) {
      console.error("Login failed:", err);
      // Provide a user-friendly error message
      if (err.message.includes('Invalid login credentials')) {
        setError('E-mail ou senha inválidos.');
      } else {
        setError('Ocorreu um erro ao tentar fazer login. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Combine auth loading state with form loading state
  const isSubmitting = loading || authLoading;

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginForm}>
        {/* SVG Logo Removed */}
        <h1>Bem-vindo ao SwiftLMS</h1>
        <p className={styles.subtitle}>Faça login para acessar seu painel.</p>
        <form onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isSubmitting}
              placeholder="seu@email.com"
            />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="password">Senha:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isSubmitting}
              placeholder="Sua senha"
            />
          </div>
          <div className={styles.checkboxGroup}>
            <div className={styles.rememberMe}>
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isSubmitting}
              />
              <label htmlFor="rememberMe">Lembrar-me</label>
            </div>
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={isSubmitting}
              className={styles.forgotPasswordButton}
            >
              Esqueceu a sua senha?
            </button>
          </div>

          {error && <p className={styles.errorMessage}>{error}</p>}
          <button type="submit" disabled={isSubmitting} className={styles.submitButton}>
          {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
          {/* Replaced duplicate button with informational text */}
          <p className={styles.infoText}>
            Se você ainda não possui credenciais cadastradas, favor entrar em contato com um administrador.
          </p>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;