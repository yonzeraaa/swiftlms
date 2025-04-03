// src/components/CourseList.tsx (Updated with Activity Logging)
import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext'; // Import useAuth
import styles from './CourseList.module.css';
import EditCourseModal from './EditCourseModal';

interface Course {
  id: string;
  title: string;
  description: string | null;
  code: string | null;
  created_at: string;
}

export interface CourseListHandle {
  refreshCourses: () => void;
}

interface CourseListProps {}

const CourseListComponent: React.ForwardRefRenderFunction<CourseListHandle, CourseListProps> = (_props, ref) => {
  const { user } = useAuth(); // Get current user
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('courses')
        .select('id, title, description, code, created_at')
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

  useImperativeHandle(ref, () => ({
    refreshCourses() {
      fetchCourses();
    }
  }));

  const handleEdit = (course: Course) => {
    console.log("Opening edit modal for course:", course);
    setEditingCourse(course);
  };

  const handleDelete = async (courseId: string) => {
    if (!user) {
        alert("Erro: Usuário não autenticado.");
        return;
    }

    // Find the course details before deleting for logging purposes
    const courseToDelete = courses.find(c => c.id === courseId);
    if (!courseToDelete) {
        alert("Erro: Curso não encontrado na lista local.");
        return;
    }

    console.log("Attempting to delete course:", courseId);
    if (window.confirm(`Tem certeza que deseja excluir o curso "${courseToDelete.title}" e todas as suas disciplinas e aulas? Esta ação não pode ser desfeita.`)) {
        try {
            // RLS allows admin delete access
            const { error: deleteError } = await supabase
                .from('courses')
                .delete()
                .eq('id', courseId);

            if (deleteError) throw deleteError;

            // Log the activity after successful deletion
            const { error: logError } = await supabase.from('activity_log').insert({
                user_id: user.id,
                action_type: 'course_deleted',
                target_id: courseId,
                target_type: 'course',
                details: { course_title: courseToDelete.title, course_code: courseToDelete.code }
            });

            if (logError) {
                console.error("Error logging course deletion activity:", logError);
                // Don't block user flow, just log the error
            }

            alert(`Curso "${courseToDelete.title}" excluído com sucesso.`);
            fetchCourses(); // Refresh the list

        } catch (err: any) {
            console.error("Error deleting course:", err);
            setError(`Falha ao excluir curso: ${err.message}`);
            alert(`Erro ao excluir curso: ${err.message}`);
        }
    }
  };

  const handleCloseModal = () => {
    setEditingCourse(null);
  };

  const handleCourseUpdated = () => {
    fetchCourses();
  };


  if (loading && courses.length === 0) return <div className={styles.loadingMessage}>Carregando cursos...</div>;
  if (error && !editingCourse) return <div className={styles.errorMessage}>Erro: {error}</div>;

  return (
    <>
      <div className={styles.listContainer}>
        <h2>Cursos Existentes</h2>
        {courses.length === 0 ? (
          <p className={styles.noItemsMessage}>Nenhum curso encontrado.</p>
        ) : (
          <ul>
            {courses.map(course => (
              <li key={course.id} className={styles.listItem}>
                <div className={styles.contentGroup}>
                  <strong>{course.title} {course.code ? `(${course.code})` : ''}</strong>
                  <p>{course.description || 'Sem descrição.'}</p>
                  <small>Criado em: {new Date(course.created_at).toLocaleDateString()}</small>
                </div>
                <div className={styles.actionsContainer}>
                  {/* Update link to point to the new associated disciplines view */}
                  <Link to={`/admin/courses/${course.id}/associated-disciplines`}>
                    <button>Gerenciar Disciplinas Associadas</button>
                  </Link>
                  <button className={styles.editButton} onClick={() => handleEdit(course)}>Editar</button>
                  {/* Pass courseId directly to handleDelete */}
                  <button className={styles.deleteButton} onClick={() => handleDelete(course.id)}>Excluir</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <EditCourseModal
        course={editingCourse}
        onClose={handleCloseModal}
        onCourseUpdated={handleCourseUpdated}
      />
    </>
  );
};

const CourseList = forwardRef(CourseListComponent);

export default CourseList;