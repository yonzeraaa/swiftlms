import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient.ts';
// import styles from './AdminCoursesPage.module.css'; // Styles to be added later

interface Course {
  id: string;
  title: string;
  description: string | null;
  code: string | null; // Add code to interface
  created_at: string;
}

const AdminCoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // --- State for New Course Form ---
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseCode, setNewCourseCode] = useState(''); // State for course code
  const [newCourseDescription, setNewCourseDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // --- Fetch Courses ---
  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('courses')
        .select('id, title, description, code, created_at') // Add code to select
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setCourses(data || []);
    } catch (err: any) {
      console.error("[AdminCoursesPage] Error fetching courses:", err);
      // Check if it's a Supabase Auth error (e.g., invalid session/token)
      if (err?.message.includes('JWT') || err?.status === 401 || err?.message.includes('invalid claim')) {
        setError('Sessão inválida ou expirada. Por favor, faça login novamente.');
        console.warn("[AdminCoursesPage] Invalid session detected during fetch.");
        // Consider triggering logout here too if useAuth was available
      } else {
        setError(err.message || 'Failed to fetch courses.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // --- Handle New Course Submission ---
  const handleAddCourse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      const { error: insertError } = await supabase
        .from('courses')
        .insert({
          title: newCourseTitle,
          description: newCourseDescription || null,
          code: newCourseCode.toUpperCase(), // Add code, convert to uppercase
        });

      if (insertError) throw insertError;

      setFormSuccess(`Curso "${newCourseTitle}" criado com sucesso!`);
      setNewCourseTitle('');
      setNewCourseDescription('');
      setNewCourseCode(''); // Clear code field
      fetchCourses(); // Refresh the list
    } catch (err: any) {
      console.error("Error adding course:", err);
      setFormError(err.message || 'Falha ao criar curso.');
    } finally {
      setIsSubmitting(false);
      // console.log('Finished handleAddCourse finally block.'); // Removed diagnostic logs
    }
  };

  // --- Render Logic ---
  return (
    // <div className={styles.coursesContainer}> // Add styles later
    <div>
      <h1>Gerenciar Cursos</h1>

      {/* Add Course Form */}
      {/* <form onSubmit={handleAddCourse} className={styles.addForm}> */}
      <form onSubmit={handleAddCourse} style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
         <h2>Adicionar Novo Curso</h2>
         {formError && <p style={{ color: 'red' }}>{formError}</p>}
         {formSuccess && <p style={{ color: 'green' }}>{formSuccess}</p>}
         <div style={{ display: 'flex', gap: '1rem' }}> {/* Layout code and title side-by-side */}
           <div style={{ flexBasis: '100px' }}> {/* Fixed width for code */}
             <label htmlFor="courseCode">Código:</label>
             <input
               type="text"
               id="courseCode"
               value={newCourseCode}
               onChange={(e) => setNewCourseCode(e.target.value)}
               required
               maxLength={4} // Limit length
               pattern="[A-Za-z]{3,4}" // Basic pattern for 3-4 letters
               title="3 ou 4 letras para o código do curso (ex: CNO)"
               disabled={isSubmitting}
               style={{ textTransform: 'uppercase' }} // Visually uppercase
             />
           </div>
           <div style={{ flexGrow: 1 }}>
             <label htmlFor="courseTitle">Título:</label>
             <input
               type="text"
               id="courseTitle"
               value={newCourseTitle}
               onChange={(e) => setNewCourseTitle(e.target.value)}
               required
               disabled={isSubmitting}
             />
           </div>
         </div>
         <div style={{ marginTop: '1rem' }}>
           <label htmlFor="courseDescription">Descrição (Opcional):</label>
           <textarea
             id="courseDescription"
             value={newCourseDescription}
             onChange={(e) => setNewCourseDescription(e.target.value)}
             rows={3}
             disabled={isSubmitting}
           />
         </div>
         <button type="submit" disabled={isSubmitting} style={{ marginTop: '1rem' }}>
           {isSubmitting ? 'Criando...' : 'Criar Curso'}
         </button>
      </form>

      <hr />

      {/* List Courses */}
      <h2>Cursos Existentes</h2>
      {loading && <p>Carregando cursos...</p>}
      {error && <p style={{ color: 'red' }}>Erro: {error}</p>}
      {!loading && !error && courses.length === 0 && <p>Nenhum curso encontrado.</p>}
      {!loading && !error && courses.length > 0 && (
        // <ul className={styles.courseList}> // Add styles later
        <ul>
          {courses.map((course) => (
            // <li key={course.id} className={styles.courseItem}>
            <li key={course.id} style={{ borderBottom: '1px solid #eee', padding: '0.5rem 0' }}>
              <strong>{course.code ? `[${course.code}] ` : ''}{course.title}</strong> {/* Display code */}
              {course.description && <p style={{ fontSize: '0.9em', color: '#555' }}>{course.description}</p>}
              <small style={{ display: 'block', color: '#777' }}>Criado em: {new Date(course.created_at).toLocaleDateString()}</small>
              {/* Add Edit/Delete buttons later */}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdminCoursesPage;