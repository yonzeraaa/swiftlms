import React, { createContext, useState, useEffect, useContext, useCallback } from 'react'; // Added useCallback
import { supabase } from '../services/supabaseClient.ts';
import { Session, User } from '@supabase/supabase-js';

// Define the shape of the context value
interface AuthContextType {
  user: User | null;
  profile: { role: string | null; account_status: string | null } | null;
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  logout: () => Promise<void>;
  profileLoading: boolean; // Represents profile fetch status
  initialAuthCheckComplete: boolean; // Represents initial auth check status
  rememberedCredentials: { email: string; password?: string };
  authError: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isStudent: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ role: string | null; account_status: string | null } | null>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(false); // Start false, true only during profile fetch
  const [initialAuthCheckComplete, setInitialAuthCheckComplete] = useState<boolean>(false); // Starts false
  const [rememberedCredentials, setRememberedCredentials] = useState<{ email: string; password?: string }>({ email: '', password: '' });
  const [authError, setAuthError] = useState<string | null>(null);

  // --- Remember Me Effect (Unchanged) ---
  useEffect(() => {
    try {
      const rememberedEmail = localStorage.getItem('rememberedEmail');
      const rememberedPassword = localStorage.getItem('rememberedPassword');
      if (rememberedEmail) {
        setRememberedCredentials({ email: rememberedEmail, password: rememberedPassword || '' });
      }
    } catch (error) {
      console.error("Error reading remembered credentials from localStorage:", error);
    }
  }, []);

  // --- Auth State Change Listener ---
  useEffect(() => {
    let initialCheckDone = false; // Flag to ensure we only set complete once
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        console.log('[AuthContext] onAuthStateChange triggered. Event:', _event, 'Session:', session ? 'Exists' : 'Null');
        const newUser = session?.user ?? null;
        setUser(newUser); // Set user state immediately

        // Determine if this is the initial check
        const isInitialCheck = !initialCheckDone;

        if (!newUser) {
          // If user logs out or session expires, clear profile and stop loading
          setProfile(null);
          setAuthError(null);
          setProfileLoading(false);
          // If this was the initial check and there's no user, mark check complete
          if (isInitialCheck) {
            setInitialAuthCheckComplete(true);
            console.log('[AuthContext] Initial auth check complete (No User).');
            initialCheckDone = true;
          }
        } else {
          // User exists. Profile fetch will be triggered by the other useEffect.
          // If this was the initial check and there IS a user, mark check complete
          if (isInitialCheck) {
            setInitialAuthCheckComplete(true);
            console.log('[AuthContext] Initial auth check complete (User Found).');
            initialCheckDone = true;
          }
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []); // Empty dependency array: runs once on mount

  // --- Logout Function (Moved Up) ---
  // Wrap in useCallback because it's used as a dependency
  const logout = useCallback(async (): Promise<void> => {
    console.log('[AuthContext] Logout function called.');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        if (error instanceof Error) {
          console.error("[AuthContext] Logout error:", error.message);
        } else {
          console.error("[AuthContext] An unknown logout error occurred");
        }
      } else {
        console.log('[AuthContext] supabase.auth.signOut() successful.');
      }
    } catch (catchError) {
        console.error("[AuthContext] Unexpected error during signOut:", catchError);
    } finally {
        console.log('[AuthContext] Cleaning up after logout attempt.');
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedPassword');
        setRememberedCredentials({ email: '', password: '' });
        // Explicitly clear user and profile state immediately on logout attempt
        setUser(null);
        setProfile(null);
        setAuthError(null); // Clear any previous auth errors
        setProfileLoading(false); // Ensure profile loading is false after logout attempt
        setInitialAuthCheckComplete(true); // Ensure initial check is marked complete on logout
    }
  }, []); // useCallback dependency array

  // --- Profile Fetch Effect (Triggered by User Change) ---
  const fetchProfileData = useCallback(async (currentUser: User) => {
    console.log('[AuthContext] fetchProfileData called for user:', currentUser.id);
    setProfileLoading(true); // Use profileLoading here
    setAuthError(null); // Clear previous errors
    let fetchedRole: string | null = null;
    let fetchedStatus: string | null = null;
    let fetchError: string | null = null;

    const profileFetchTimeout = 20000; // 20 seconds timeout for combined fetch
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      const fetchPromise = Promise.allSettled([
        // Fetch role via RPC
        supabase.rpc('get_my_role').then(({ data, error }) => {
          if (error) {
            console.error('[AuthContext] Error fetching role via RPC:', error);
            throw new Error(`Erro ao buscar papel (role): ${error.message}`);
          }
          console.log('[AuthContext] Role fetched via RPC:', data);
          return data as string | null;
        }),
        // Fetch status directly (relies on individual read RLS)
        supabase
          .from('profiles')
          .select('account_status')
          .eq('id', currentUser.id)
          .single()
          .then(({ data, error, status }) => {
            if (error && status !== 406) { // 406 means no rows found, which is handled below
              console.error('[AuthContext] Error fetching account_status:', error);
              throw new Error(`Erro ao buscar status da conta: ${error.message}`);
            }
            console.log('[AuthContext] Account status fetched:', data);
            return data?.account_status ?? null; // Return null if no profile found
          }),
      ]);

      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('Profile fetch timed out'));
        }, profileFetchTimeout);
      });

      // Race the fetch against the timeout
      const results = await Promise.race([fetchPromise, timeoutPromise]) as PromiseSettledResult<string | null>[];

      if (timeoutId) clearTimeout(timeoutId); // Clear timeout if fetch finished first

      // Process results if fetch didn't time out
      if (results && Array.isArray(results)) {
        if (results[0].status === 'fulfilled') {
          fetchedRole = results[0].value;
        } else {
          console.error('[AuthContext] Role fetch promise rejected:', results[0].reason);
          fetchError = results[0].reason instanceof Error ? results[0].reason.message : 'Erro desconhecido ao buscar papel.';
        }

        if (results[1].status === 'fulfilled') {
          fetchedStatus = results[1].value;
        } else {
          console.error('[AuthContext] Status fetch promise rejected:', results[1].reason);
          // Prioritize status fetch error message if role fetch also failed
          fetchError = results[1].reason instanceof Error ? results[1].reason.message : 'Erro desconhecido ao buscar status.';
        }

        if (fetchedStatus === null && results[1].status === 'fulfilled') {
             console.warn('[AuthContext] Profile not found for user ID:', currentUser.id);
             fetchError = 'Perfil de usuário não encontrado.';
        }

      } else {
         // This case should ideally not happen if Promise.race works as expected
         // but handles the case where results is not the expected array (e.g., timeout occurred)
         if (!fetchError) { // Only set timeout error if no specific fetch error occurred
            console.error('[AuthContext] Profile fetch timed out after', profileFetchTimeout / 1000, 'seconds.');
            fetchError = 'Tempo limite excedido ao buscar perfil.';
         }
      }

    } catch (error) { // Catch errors from Promise.race (like timeout) or setup errors
      if (timeoutId) clearTimeout(timeoutId);
      console.error('[AuthContext] Error during profile data fetch:', error);
      fetchError = error instanceof Error ? error.message : 'Erro inesperado ao buscar perfil.';
    } finally {
      if (fetchError) {
        setAuthError(fetchError);
        setProfile(null); // Clear profile on error
        // Consider logging out if profile is essential and fetch failed critically
        // setTimeout(() => logout(), 50);
      } else if (fetchedStatus === 'frozen') {
         console.warn('[AuthContext] User account is frozen. Logging out.');
         setAuthError('Sua conta está congelada. Entre em contato com um administrador.');
         setProfile({ role: fetchedRole, account_status: fetchedStatus }); // Set profile before logout triggers state change
         setTimeout(() => logout(), 50); // Logout slightly delayed
      } else if (fetchedStatus === null) {
         // Handle case where profile doesn't exist but status fetch didn't error
         setAuthError('Perfil de usuário não encontrado.');
         setProfile(null);
      }
      else {
        setProfile({ role: fetchedRole, account_status: fetchedStatus });
        setAuthError(null); // Clear error on success
      }
      setProfileLoading(false); // Use profileLoading here
      console.log('[AuthContext] fetchProfileData finished. Profile:', { role: fetchedRole, account_status: fetchedStatus }, 'Error:', fetchError);
    }
  }, [logout]); // Added logout to dependency array

  useEffect(() => {
    if (user) {
      fetchProfileData(user);
    } else {
      // Ensure profile loading is false if user becomes null
      if (profileLoading) {
         setProfileLoading(false);
      }
    }
  }, [user, fetchProfileData]); // Depend on user and the memoized fetch function


  // --- Login Function (Small adjustment for loading) ---
  const login = async (email: string, password: string, rememberMe: boolean): Promise<void> => {
    setAuthError(null);
    // Don't set loading here, onAuthStateChange and fetchProfileData handle it
    // setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Remember me logic (unchanged)
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
        localStorage.setItem('rememberedPassword', password);
        setRememberedCredentials({ email, password });
      } else {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedPassword');
        setRememberedCredentials({ email: '', password: '' });
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error("Login error:", error.message);
        setAuthError(`Erro no login: ${error.message}`); // Set specific login error
      } else {
        console.error("An unknown login error occurred");
        setAuthError('Ocorreu um erro desconhecido no login.');
      }
      // setLoading(false); // Loading is handled by auth state change now
      setUser(null); // Ensure user is null on login failure
      setProfile(null);
      throw error; // Re-throw for the component to handle if needed
    }
    // No finally setLoading(false) here
  };

  // --- Logout Function (Moved Up) ---

  // --- Context Value ---
  const value: AuthContextType = {
    user,
    profile,
    login,
    logout,
    profileLoading,
    initialAuthCheckComplete,
    rememberedCredentials,
    authError,
    // isAuthenticated depends on initial check being complete AND user existing AND status being active
    isAuthenticated: initialAuthCheckComplete && !!user && profile?.account_status === 'active',
    isAdmin: !!profile && profile.role === 'admin',
    isStudent: !!profile && profile.role === 'aluno', // Assuming 'aluno' is the student role text
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// --- useAuth Hook (Unchanged) ---
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === null || context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};