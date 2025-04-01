import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../services/supabaseClient.ts'; // Corrected extension
import { Session, User } from '@supabase/supabase-js'; // Import types

// Define the shape of the context value
interface AuthContextType {
  user: User | null;
  profile: { role: string } | null;
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>; // Added types
  logout: () => Promise<void>;
  loading: boolean;
  rememberedCredentials: { email: string; password?: string };
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
  const [profile, setProfile] = useState<{ role: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [rememberedCredentials, setRememberedCredentials] = useState<{ email: string; password?: string }>({ email: '', password: '' });

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
        setUser(session?.user ?? null);

        if (session?.user) {
          // Fetch profile when user is logged in
          try {
            const { data, error, status } = await supabase
              .from('profiles')
              .select(`role`) // Select only the role for now
              .eq('id', session.user.id)
              .single();

            if (error && status !== 406) { // 406 means no rows found, which might happen briefly
              throw error;
            }

            if (data) {
              setProfile(data);
            } else {
              setProfile(null); // Ensure profile is null if not found
            }
          } catch (error) {
            // Type assertion or check for error handling
            if (error instanceof Error) {
              console.error('Error fetching user profile:', error.message);
            } else {
              console.error('An unknown error occurred while fetching user profile');
            }
            setProfile(null); // Reset profile on error
          } finally {
             // Ensure loading is set to false *after* profile fetch attempt is done
             // but only if we were fetching a profile because a user exists.
             setLoading(false);
          }
        } else {
          setProfile(null); // Clear profile on logout
          setLoading(false); // Also set loading false if there's no session
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
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      // Type assertion or check for error handling
      if (error instanceof Error) {
        console.error("Logout error:", error.message);
      } else {
        console.error("An unknown logout error occurred");
      }
      // Don't clear user/profile here, let onAuthStateChange handle it
    }
    // Clear remembered credentials on explicit logout
    localStorage.removeItem('rememberedEmail');
    localStorage.removeItem('rememberedPassword');
    setRememberedCredentials({ email: '', password: '' });
    setLoading(false); // Set loading false after signout attempt
  };

  // Value provided by the context
  // Ensure the value object matches the AuthContextType
  const value: AuthContextType = {
    user,
    profile,
    login,
    logout,
    loading,
    rememberedCredentials,
    isAuthenticated: !!user,
    // Ensure profile is checked before accessing role
    isAdmin: !!profile && profile.role === 'admin',
    isStudent: !!profile && profile.role === 'student',
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children} {/* Optionally render children only when initial loading is done */}
      {/* Or just render children immediately: children */}
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