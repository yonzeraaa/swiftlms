// src/components/CourseList.tsx
import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Link } from 'react-router-dom'; // Import Link for navigation
import { supabase } from '../services/supabaseClient';
import styles from './CourseList.module.css'; // Import styles

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

// Wrap component with forwardRef
const CourseList = forwardRef<CourseListHandle>((_props, ref) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading && courses.length === 0) return <div className={styles.loadingMessage}>Carregando cursos...</div>; // Use style for initial load
  if (error) return <div className={styles.errorMessage}>Erro: {error}</div>; // Use style for error

  return (
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
                  <button>Gerenciar Disciplinas</button> {/* Button style applied via CSS module */}
                </Link>
                {/* Add Edit/Delete buttons later */}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}); // End of forwardRef

export default CourseList;