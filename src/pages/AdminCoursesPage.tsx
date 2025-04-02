// src/pages/AdminCoursesPage.tsx
import React, { useRef } from 'react'; // Import useRef
import CourseList, { CourseListHandle } from '../components/CourseList'; // Import the CourseList component and its handle type
import AddCourseForm from '../components/AddCourseForm';
import styles from './AdminCoursesPage.module.css'; // Import the CSS module

const AdminCoursesPage: React.FC = () => {
  const courseListRef = useRef<CourseListHandle>(null); // Create a ref for CourseList

  // Callback function to refresh the course list
  const handleCourseAdded = () => {
    courseListRef.current?.refreshCourses(); // Call refreshCourses via the ref
  };

  return (
    <div className={styles.pageContainer}> {/* Apply container style */}
      <h1>Gerenciar Cursos</h1>
      <p>Adicione, edite e organize cursos, disciplinas e aulas.</p>
      {/* hr styling is handled globally or within the container */}
      <AddCourseForm onCourseAdded={handleCourseAdded} />
      <hr />
      <CourseList ref={courseListRef} />
    </div>
  );
};

export default AdminCoursesPage;