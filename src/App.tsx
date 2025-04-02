import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext.tsx';

// Import Page Components
import LoginPage from './pages/LoginPage.tsx';
import AdminStudentsPage from './pages/AdminStudentsPage.tsx'; // Renamed import
import AdminOverviewPage from './pages/AdminOverviewPage.tsx'; // Import new overview page
import StudentDashboard from './pages/StudentDashboard.tsx';
import AdminCoursesPage from './pages/AdminCoursesPage.tsx';
import AdminDisciplinesPage from './pages/AdminDisciplinesPage.tsx';
import AdminLessonsPage from './pages/AdminLessonsPage.tsx';
import AdminEnrollmentsPage from './pages/AdminEnrollmentsPage.tsx';
import CourseViewPage from './pages/CourseViewPage.tsx';
import MyCoursesPage from './pages/MyCoursesPage.tsx'; // Import my courses page
// import AdminCoursesPageWrapper from './pages/AdminCoursesPageWrapper.tsx'; // Remove wrapper import
import RootRedirector from './components/RootRedirector.tsx';
import Layout from './components/Layout.tsx'; // Import the Layout component

// --- Route Protection Components ---

// Component for routes accessible only when NOT authenticated (e.g., Login)
const PublicRoute: React.FC = () => {
  const { isAuthenticated, isAdmin, isStudent } = useAuth();

  if (isAuthenticated) {
    // Redirect logged-in users away from public-only pages
    if (isAdmin) return <Navigate to="/admin" replace />;
    if (isStudent) return <Navigate to="/student" replace />;
    // Fallback if role isn't determined yet or is unexpected (should ideally not happen)
    return <Navigate to="/" replace />;
  }

  return <Outlet />; // Render child route component (e.g., LoginPage)
};

// Component for routes accessible only WHEN authenticated
// Optional role prop for role-specific protection
interface ProtectedRouteProps {
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, profile, loading } = useAuth();
  const userRole = profile?.role;

  // REMOVED: Top-level loading check based on AuthContext.
  // Child components will manage their own data loading state.
  // if (loading) {
  //   return <div>Loading...</div>;
  // }

  if (!isAuthenticated) {
    // Redirect unauthenticated users to login
    return <Navigate to="/login" replace />;
  }

  // Check role if allowedRoles are specified
  if (allowedRoles && (!userRole || !allowedRoles.includes(userRole))) {
    // Redirect if user role is not allowed for this route
    // Could redirect to a generic dashboard or an "Unauthorized" page
    console.warn(`User role "${userRole}" not allowed for this route. Redirecting.`);
    // For now, redirect to login, but a better destination might be needed
    return <Navigate to="/login" replace />;
  }

  return <Outlet />; // Render child route component (e.g., AdminDashboard)
};

// --- Main App Component ---

function App() {
  const { loading } = useAuth(); // Only need loading for the initial app render check

  // Optional: Show global loading state initially
  if (loading) {
     // TODO: Replace with a proper loading spinner/component
    return <div>Loading Application...</div>;
  }

  return (
    <Routes>
      {/* Public Routes (e.g., Login) */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Protected Routes - Wrapped in Layout */}
      <Route element={<Layout />}>
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AdminOverviewPage />} /> {/* Point /admin to overview */}
          <Route path="/admin/students" element={<AdminStudentsPage />} /> {/* Add route for students */}
          <Route path="/admin/courses" element={<AdminCoursesPage />} />
          <Route path="/admin/courses/:courseId/disciplines" element={<AdminDisciplinesPage />} />
          <Route path="/admin/courses/:courseId/disciplines/:disciplineId/lessons" element={<AdminLessonsPage />} />
          <Route path="/admin/courses/:courseId/enrollments" element={<AdminEnrollmentsPage />} /> {/* Add route for enrollments */}
          {/* Add other admin-specific routes here */}
        </Route>
        <Route element={<ProtectedRoute allowedRoles={['aluno']} />}>
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/student/courses" element={<MyCoursesPage />} />
          {/* Move Course View inside student routes */}
          <Route path="/student/courses/:courseId" element={<CourseViewPage />} /> {/* Change path */}
          {/* Add other student-specific routes here */}
        </Route>
        {/* Course View Route moved inside /student */}
        {/* <Route element={<ProtectedRoute />}>
           <Route path="/courses/:courseId" element={<CourseViewPage />} />
        </Route> */}
      </Route>

      {/* Root path redirection */}
      <Route
        path="/"
        element={<RootRedirector />} // Use the dedicated component for root redirection
      />

      {/* Catch-all for undefined routes (optional) */}
      <Route path="*" element={<Navigate to="/" replace />} />
      {/* Or display a 404 component: <Route path="*" element={<NotFoundPage />} /> */}

    </Routes>
  );
}

export default App;
