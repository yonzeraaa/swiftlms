// src/components/CourseList.tsx
import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import styles from './CourseList.module.css';
import EditCourseModal from './EditCourseModal'; // Import the modal component

interface Course {
  id: string;
  title: string;
  description: string | null;
  code: string | null;
  created_at: string;
}

// Define the type for the exposed handle
export interface CourseListHandle {
  refreshCourses: () => void;
}

// Define the inner component logic
// Define props type (empty for now)
interface CourseListProps {}

const CourseListComponent: React.ForwardRefRenderFunction<CourseListHandle, CourseListProps> = (_props, ref) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null); // Error state was missing here
  const [editingCourse, setEditingCourse] = useState<Course | null>(null); // State for modal
  // Removed duplicate error state declaration

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Admins should have read access via RLS policy
      const { data, error: fetchError } = await supabase
        .from('courses')
        .select('id, title, description, code, created_at') // Select code
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setCourses(data || []);
    } catch (err: any) {
      console.error("Error fetching courses:", err);
      setError(err.message || 'Falha ao buscar cursos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Expose the fetchCourses function via the ref handle
  useImperativeHandle(ref, () => ({
    refreshCourses() {
      fetchCourses();
    }
  }));

  // Function to open the edit modal
  const handleEdit = (course: Course) => {
    console.log("Opening edit modal for course:", course);
    setEditingCourse(course);
  };

  const handleDelete = async (courseId: string) => { // Make async
    console.log("Attempting to delete course:", courseId);
    if (window.confirm("Tem certeza que deseja excluir este curso e todas as suas disciplinas e aulas? Esta ação não pode ser desfeita.")) {
        try {
            // RLS allows admin delete access
            const { error: deleteError } = await supabase
                .from('courses')
                .delete()
                .eq('id', courseId);

            if (deleteError) throw deleteError;

            alert(`Curso ID: ${courseId} excluído com sucesso.`);
            // Refresh the list after deletion
            fetchCourses(); // Call fetchCourses directly as it's in scope

        } catch (err: any) {
            console.error("Error deleting course:", err);
            setError(`Falha ao excluir curso: ${err.message}`); // Update error state
            alert(`Erro ao excluir curso: ${err.message}`);
        }
    }
  };

  // Function to close the modal
  const handleCloseModal = () => {
    setEditingCourse(null);
  };

  // Function to refresh list after update (passed to modal)
  const handleCourseUpdated = () => {
    fetchCourses(); // Re-fetch the list
  };


  if (loading && courses.length === 0) return <div className={styles.loadingMessage}>Carregando cursos...</div>;
  if (error && !editingCourse) return <div className={styles.errorMessage}>Erro: {error}</div>; // Show list error only if modal isn't open

  return (
    // Use React.Fragment as the top-level element
    <>
      <div className={styles.listContainer}> {/* Apply container style */}
        <h2>Cursos Existentes</h2>
        {courses.length === 0 ? (
          <p className={styles.noItemsMessage}>Nenhum curso encontrado.</p>
        ) : (
          <ul>
            {courses.map(course => (
              <li key={course.id} className={styles.listItem}> {/* Apply item style */}
                <div className={styles.contentGroup}> {/* Group main content */}
                  <strong>{course.title} {course.code ? `(${course.code})` : ''}</strong> {/* Display code */}
                  <p>{course.description || 'Sem descrição.'}</p>
                  <small>Criado em: {new Date(course.created_at).toLocaleDateString()}</small>
                </div>
                <div className={styles.actionsContainer}> {/* Keep actions separate */}
                  <Link to={`/admin/courses/${course.id}/disciplines`}>
                    <button>Gerenciar Disciplinas</button>
                  </Link>
                  <button className={styles.editButton} onClick={() => handleEdit(course)}>Editar</button> {/* Add Edit Button */}
                  <button className={styles.deleteButton} onClick={() => handleDelete(course.id)}>Excluir</button> {/* Add Delete Button */}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Render the modal conditionally outside the main list container */}
      <EditCourseModal
        course={editingCourse}
        onClose={handleCloseModal}
        onCourseUpdated={handleCourseUpdated}
      />
    </>
  );
};

// Wrap the inner component with forwardRef
const CourseList = forwardRef(CourseListComponent);

export default CourseList;