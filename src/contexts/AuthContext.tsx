import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../services/supabaseClient.ts'; // Corrected extension
import { Session, User } from '@supabase/supabase-js'; // Import types

// Define the shape of the context value
interface AuthContextType {
  user: User | null;
  profile: { role: string | null; account_status: string | null } | null; // Update interface to match state
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>; // Added types
  logout: () => Promise<void>;
  loading: boolean;
  rememberedCredentials: { email: string; password?: string };
  authError: string | null; // Add state for auth-related errors (like frozen account)
  isAuthenticated: boolean;
  isAdmin: boolean;
  isStudent: boolean;
}

// Create the context with a default value (or null/undefined and handle it)
// Providing null requires checks in useAuth or consumers
const AuthContext = createContext<AuthContextType | null>(null);

// Create the provider component
// Define props type for AuthProvider
interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Add types to state
  const [user, setUser] = useState<User | null>(null);
  // Update profile state type to include account_status
  const [profile, setProfile] = useState<{ role: string | null; account_status: string | null } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [rememberedCredentials, setRememberedCredentials] = useState<{ email: string; password?: string }>({ email: '', password: '' });
  const [authError, setAuthError] = useState<string | null>(null); // Initialize auth error state

  // Effect to check local storage for remembered credentials on initial load
  useEffect(() => {
    try {
      const rememberedEmail = localStorage.getItem('rememberedEmail');
      const rememberedPassword = localStorage.getItem('rememberedPassword'); // SECURITY RISK: Storing plain password
      if (rememberedEmail) {
        setRememberedCredentials({ email: rememberedEmail, password: rememberedPassword || '' });
      }
    } catch (error) {
      console.error("Error reading remembered credentials from localStorage:", error);
    }
  }, []);

  // Effect to listen for Supabase auth state changes
  useEffect(() => {
    setLoading(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      // Add types to callback parameters
      async (_event: string, session: Session | null) => {
        console.log('[AuthContext] onAuthStateChange triggered. Event:', _event, 'Session:', session);
        setUser(session?.user ?? null);
        console.log('[AuthContext] User state set:', session?.user ?? null);

        if (session?.user) {
          console.log('[AuthContext] Session exists, attempting to fetch profile...');
          // Fetch profile when user is logged in
          try {
            const { data, error, status } = await supabase
              .from('profiles')
              .select(`role, account_status`) // Select status as well
              .eq('id', session.user.id)
              .single();

            // Log the raw response for debugging
            console.log('[AuthContext] Profile fetch response:', { data, error, status });

            if (error && status !== 406) {
              console.error('[AuthContext] Supabase profile fetch error details:', error); // Log the specific Supabase error
              throw error; // Re-throw the original Supabase error
            }

            if (data) {
              console.log('[AuthContext] Profile data fetched:', data);
              setProfile(data as { role: string | null; account_status: string | null }); // Cast data type

              // Check if account is frozen AFTER setting profile
              if (data?.account_status === 'frozen') {
                console.warn('[AuthContext] User account is frozen. Logging out.');
                setAuthError('Sua conta está congelada. Entre em contato com um administrador.');
                // Use setTimeout to allow state update before logout triggers another auth change
                setTimeout(() => logout(), 50);
              } else {
                 setAuthError(null); // Clear any previous auth error if status is okay
              }

            } else {
              console.log('[AuthContext] No profile data found for user.');
              setProfile(null);
              setAuthError('Perfil de usuário não encontrado.'); // Set error if profile missing
            }
          } catch (error) {
            // Log the caught error more specifically
            console.error('[AuthContext] Error caught during profile fetch:', error);
            // Type assertion or check for error handling
            if (error instanceof Error) {
              // Log Supabase specific details if available
              const supabaseError = error as any; // Use 'any' carefully for logging non-standard props
              console.error('[AuthContext] Error message:', supabaseError.message);
              if (supabaseError.details) console.error('[AuthContext] Error details:', supabaseError.details);
              if (supabaseError.hint) console.error('[AuthContext] Error hint:', supabaseError.hint);
              if (supabaseError.code) console.error('[AuthContext] Error code:', supabaseError.code);
            } else {
              console.error('[AuthContext] A non-Error object was thrown during profile fetch:', error);
            }
            setProfile(null);
            setAuthError('Erro ao buscar perfil de usuário.'); // Set error on fetch failure
          } finally {
             console.log('[AuthContext] Profile fetch attempt finished. Setting loading=false.');
             // Only set loading false if not logging out due to frozen status
             if (profile?.account_status !== 'frozen') {
                setLoading(false);
             }
          }
        } else {
          console.log('[AuthContext] No session found. Clearing profile and setting loading=false.');
          setProfile(null);
          setAuthError(null); // Clear auth error on logout/no session
          setLoading(false);
        }
        // setLoading(false); // REMOVED from here
      }
    );

    // Cleanup subscription on unmount
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Login function
  // Add types to function parameters
  const login = async (email: string, password: string, rememberMe: boolean): Promise<void> => {
    setAuthError(null); // Clear previous auth errors on new login attempt
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Handle Remember Me
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
        localStorage.setItem('rememberedPassword', password); // SECURITY RISK
        setRememberedCredentials({ email, password });
      } else {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedPassword');
        setRememberedCredentials({ email: '', password: '' });
      }
      // User state and profile will be updated by onAuthStateChange listener
    } catch (error) {
      // Type assertion or check for error handling
      if (error instanceof Error) {
        console.error("Login error:", error.message);
      } else {
        console.error("An unknown login error occurred");
      }
      setLoading(false); // Ensure loading is false on error
      throw error; // Re-throw error to be caught by the calling component
    }
    // setLoading(false) will be called by the onAuthStateChange listener
  };

  // Logout function
  // Add return type
  const logout = async (): Promise<void> => {
    console.log('[AuthContext] Logout function called.'); // Log start
    setLoading(true);
    try { // Wrap signout in try/catch
      const { error } = await supabase.auth.signOut();

      if (error) {
        // Type assertion or check for error handling
        if (error instanceof Error) {
          console.error("[AuthContext] Logout error:", error.message);
        } else {
          console.error("[AuthContext] An unknown logout error occurred");
        }
        // Optionally re-throw or handle differently
      } else {
        console.log('[AuthContext] supabase.auth.signOut() successful.'); // Log success
      }
    } catch (catchError) {
        // Catch any unexpected errors during signout itself
        console.error("[AuthContext] Unexpected error during signOut:", catchError);
    } finally {
        // This block runs regardless of success or error in try/catch
        console.log('[AuthContext] Cleaning up after logout attempt.');
        // Clear remembered credentials on explicit logout attempt
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedPassword');
        setRememberedCredentials({ email: '', password: '' });
        // Don't clear user/profile here, let onAuthStateChange handle it
        setLoading(false); // Set loading false after signout attempt is finished
    }
  };

  // Value provided by the context
  // Ensure the value object matches the AuthContextType
  const value: AuthContextType = {
    user,
    profile, // Profile now includes account_status
    login,
    logout,
    loading,
    rememberedCredentials,
    authError, // Expose auth error state
    isAuthenticated: !!user && profile?.account_status === 'active', // User is only truly authenticated if active
    // Roles are valid even if frozen, but isAuthenticated check prevents access
    isAdmin: !!profile && profile.role === 'admin',
    isStudent: !!profile && profile.role === 'student',
  };

  return (
    <AuthContext.Provider value={value}>
      {children} {/* Always render children; internal components handle loading */}
    </AuthContext.Provider>
  );
};

// Custom hook to use the Auth context
export const useAuth = (): AuthContextType => { // Add return type
  const context = useContext(AuthContext);
  // Check if context is null (if createContext had null default) or undefined
  if (context === null || context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};