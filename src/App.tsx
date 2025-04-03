import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext.tsx';

// Import Page Components
import LoginPage from './pages/LoginPage.tsx';
import AdminStudentsPage from './pages/AdminStudentsPage.tsx'; // Renamed import
import AdminOverviewPage from './pages/AdminOverviewPage.tsx'; // Import new overview page
import StudentDashboard from './pages/StudentDashboard.tsx';
import AdminCoursesPage from './pages/AdminCoursesPage.tsx';
// import AdminDisciplinesPage from './pages/AdminDisciplinesPage.tsx'; // No longer used directly here
import AdminDisciplinesBankPage from './pages/AdminDisciplinesBankPage.tsx'; // Import the new bank page
import AdminAssociatedDisciplinesPage from './pages/AdminAssociatedDisciplinesPage.tsx'; // Import the new associated disciplines page
// import AdminLessonsPage from './pages/AdminLessonsPage.tsx'; // No longer used directly here
import AdminLessonsBankPage from './pages/AdminLessonsBankPage.tsx'; // Import the new lesson bank page
import AdminAssociatedLessonsPage from './pages/AdminAssociatedLessonsPage.tsx'; // Import the associated lessons page
import AdminEnrollmentsPage from './pages/AdminEnrollmentsPage.tsx';
// import AdminViewStudentDashboard from './pages/AdminViewStudentDashboard.tsx'; // Removed import
import CourseViewPage from './pages/CourseViewPage.tsx';
import MyCoursesPage from './pages/MyCoursesPage.tsx'; // Import my courses page
// import AdminCoursesPageWrapper from './pages/AdminCoursesPageWrapper.tsx'; // Remove wrapper import
import RootRedirector from './components/RootRedirector.tsx';
import Layout from './components/Layout.tsx'; // Import the Layout component

// --- Route Protection Components ---

// Component for routes accessible only when NOT authenticated (e.g., Login)
const PublicRoute: React.FC = () => {
  const { isAuthenticated, isAdmin, isStudent, initialAuthCheckComplete } = useAuth(); // Add initialAuthCheckComplete
  // Add logging
  const path = window.location.pathname;
  console.log(`[PublicRoute] Path: ${path}, initialAuthCheckComplete: ${initialAuthCheckComplete}, isAuthenticated: ${isAuthenticated}, isAdmin: ${isAdmin}`);

  // Wait for initial check before redirecting logged-in users
  if (!initialAuthCheckComplete) {
    console.log(`[PublicRoute] Path: ${path}, Waiting for initial auth check...`);
    return <div>Initializing...</div>; // Or null, or a spinner
  }

  if (isAuthenticated) {
    console.log(`[PublicRoute] Path: ${path}, Authenticated. Redirecting...`);
    // Redirect logged-in users away from public-only pages
    if (isAdmin) {
        console.log(`[PublicRoute] Path: ${path}, Redirecting admin to /admin.`);
        return <Navigate to="/admin" replace />;
    }
    if (isStudent) {
        console.log(`[PublicRoute] Path: ${path}, Redirecting student to /student.`);
        return <Navigate to="/student" replace />;
    }
    // Fallback should ideally not happen if profile loads correctly
    console.warn(`[PublicRoute] Path: ${path}, Authenticated but role unknown? Redirecting to /.`);
    return <Navigate to="/" replace />;
  }
  console.log(`[PublicRoute] Path: ${path}, Not authenticated. Rendering Outlet.`);

  return <Outlet />; // Render child route component (e.g., LoginPage)
};

// Component for routes accessible only WHEN authenticated
// Optional role prop for role-specific protection
interface ProtectedRouteProps {
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, profile, initialAuthCheckComplete, profileLoading } = useAuth(); // Use new loading states
  // Removed first userRole declaration

  const path = window.location.pathname; // Get current path for logging



  // 1. Wait for initial Supabase auth check
  console.log(`[ProtectedRoute] Path: ${path}, Step 1: Checking initialAuthCheckComplete: ${initialAuthCheckComplete}`);
  if (!initialAuthCheckComplete) {
    return <div>Initializing Session...</div>;
  }

  // 2. Wait for profile loading to complete
  console.log(`[ProtectedRoute] Path: ${path}, Step 2: Checking profileLoading: ${profileLoading}`);
  if (profileLoading) {
     return <div>Loading Profile...</div>;
  }

  // --- At this point, initial check is done AND profile loading is done ---

  // 3. Check if profile exists (essential for role and status checks)
  console.log(`[ProtectedRoute] Path: ${path}, Step 3: Checking profile exists: ${!!profile}`);
  if (!profile) {
      // This could happen if profile fetch failed or user has no profile row
      console.error(`[ProtectedRoute] Path: ${path}, Profile data missing after loading. Redirecting to login.`);
      // Consider calling logout() from context here if profile is mandatory
      return <Navigate to="/login" replace />;
  }

  // 4. Check authentication status (which includes account_status check)
  console.log(`[ProtectedRoute] Path: ${path}, Step 4: Checking isAuthenticated: ${isAuthenticated}`);
  if (!isAuthenticated) {
    // This implies account_status is not 'active' or user became null unexpectedly
    console.log(`[ProtectedRoute] Path: ${path}, Not authenticated (likely inactive status). Redirecting to /login.`);
    return <Navigate to="/login" replace />;
  }

  // 5. Check role existence (redundant check given step 3, but safe)
  console.log(`[ProtectedRoute] Path: ${path}, Step 5: Checking profile.role: ${profile.role}`);
  if (!profile.role) {
      console.error(`[ProtectedRoute] Path: ${path}, Authenticated but role missing. Redirecting to login.`);
      return <Navigate to="/login" replace />;
  }

  // Role is guaranteed to exist here
  const currentRole = profile.role;
  console.log(`[ProtectedRoute] Path: ${path}, Step 6: Role confirmed: ${currentRole}`);

  // 7. Handle Admin role
  if (currentRole === 'admin') {
    console.log(`[ProtectedRoute] Path: ${path}, Admin detected. Rendering Outlet.`);
    return <Outlet />;
  }

  // 8. Handle non-admin roles
  console.log(`[ProtectedRoute] Path: ${path}, Step 8: Checking non-admin roles. Allowed: ${allowedRoles?.join(', ')}`);
  if (allowedRoles && !allowedRoles.includes(currentRole)) {
      console.warn(`[ProtectedRoute] Path: ${path}, User role "${currentRole}" not allowed. Allowed: ${allowedRoles.join(', ')}. Redirecting.`);
      if (currentRole === 'aluno') return <Navigate to="/student" replace />;
      return <Navigate to="/login" replace />;
  }

  // 9. Role allowed or no roles specified
  console.log(`[ProtectedRoute] Path: ${path}, Non-admin role allowed or no specific roles required. Rendering Outlet.`);
  return <Outlet />;
};

// --- Main App Component ---

function App() {
  const { initialAuthCheckComplete } = useAuth(); // Use initialAuthCheckComplete

  // Optional: Show global loading state initially
  if (!initialAuthCheckComplete) { // Wait for the initial check
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
          {/* <Route path="/admin/courses/:courseId/disciplines" element={<AdminDisciplinesPage />} /> */} {/* REMOVED: Old discipline management route */}
          <Route path="/admin/disciplines-bank" element={<AdminDisciplinesBankPage />} /> {/* ADDED: Route for central discipline bank */}
          <Route path="/admin/lessons-bank" element={<AdminLessonsBankPage />} /> {/* ADDED: Route for central lesson bank */}
          {/* ADDED: Route for viewing/managing disciplines associated with a specific course */}
          <Route path="/admin/courses/:courseId/associated-disciplines" element={<AdminAssociatedDisciplinesPage />} />
          {/* ADDED: Route for viewing/managing lessons associated with a specific discipline */}
          {/* Route for managing lessons associated with a specific discipline */}
          <Route path="/admin/disciplines/:disciplineId/associated-lessons" element={<AdminAssociatedLessonsPage />} />
          {/* REMOVED: Old lesson management route */}
          {/* <Route path="/admin/disciplines/:disciplineId/lessons" element={<AdminLessonsPage />} /> */}
          <Route path="/admin/courses/:courseId/enrollments" element={<AdminEnrollmentsPage />} /> {/* Add route for enrollments */}
          {/* REMOVED: Route for admin to view a specific student's dashboard */}
          {/* <Route path="/admin/view-student/:studentId" element={<AdminViewStudentDashboard />} /> */}
          {/* Add other admin-specific routes here */}
        </Route>
        <Route element={<ProtectedRoute allowedRoles={['aluno', 'admin']} />}> {/* Allow admin access again */}
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
