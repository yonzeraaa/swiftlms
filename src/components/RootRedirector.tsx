import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.tsx';

const RootRedirector: React.FC = () => {
  const { isAuthenticated, isAdmin, isStudent, initialAuthCheckComplete } = useAuth(); // Use initialAuthCheckComplete

  // Wait until the authentication status and profile are loaded
  if (!initialAuthCheckComplete) { // Check if initial check is NOT complete
    // TODO: Replace with a proper loading spinner/component
    return <div>Loading...</div>;
  }

  // If loading is finished, proceed with redirection logic
  if (isAuthenticated) {
    if (isAdmin) {
      return <Navigate to="/admin" replace />;
    }
    if (isStudent) {
      return <Navigate to="/student" replace />;
    }
    // Fallback if authenticated but role is somehow still unknown
    // This might indicate an issue with the profile data or logic
    console.warn("Authenticated user detected, but role (admin/student) is unknown. Redirecting to login.");
    return <Navigate to="/login" replace />;
  } else {
    // Not authenticated, redirect to login
    return <Navigate to="/login" replace />;
  }
};

export default RootRedirector;