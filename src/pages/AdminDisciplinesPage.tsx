// src/pages/AdminDisciplinesPage.tsx
import React, { useState, useEffect, useRef } from 'react'; // Import useRef
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import DisciplineList, { DisciplineListHandle } from '../components/DisciplineList'; // Import DisciplineList and handle
import AddDisciplineForm from '../components/AddDisciplineForm'; // Import the form
import styles from './AdminDisciplinesPage.module.css'; // Import the CSS module

interface Course {
    id: string;
    title: string;
    code: string | null;
}

const AdminDisciplinesPage: React.FC = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true); // Course details loading
    const [error, setError] = useState<string | null>(null);
    const disciplineListRef = useRef<DisciplineListHandle>(null); // For refreshing later

    useEffect(() => {
        const fetchCourse = async () => {
            if (!courseId) {
                setError("ID do curso não encontrado na URL.");
                setLoading(false);
                return;
            }
            setLoading(true);
            setError(null);
            try {
                const { data, error: fetchError } = await supabase
                    .from('courses')
                    .select('id, title, code')
                    .eq('id', courseId)
                    .single();

                if (fetchError) throw fetchError;
                if (!data) throw new Error("Curso não encontrado.");

                setCourse(data);
            } catch (err: any) {
                console.error("Error fetching course details:", err);
                setError(err.message || 'Falha ao buscar detalhes do curso.');
            } finally {
                setLoading(false);
            }
        };

        fetchCourse();
    }, [courseId]);

    const handleDisciplineAdded = () => {
        disciplineListRef.current?.refreshDisciplines();
    };

    if (loading) return <div>Carregando detalhes do curso...</div>;
    if (error) return <div style={{ color: 'red' }}>Erro: {error}</div>;
    if (!course) return <div>Curso não encontrado.</div>;

    return (
        <div className={styles.pageContainer}> {/* Apply container style */}
            <Link to="/admin/courses" className={styles.backLink}>&larr; Voltar para Cursos</Link> {/* Use static path and update text */}
            <h1>Gerenciar Disciplinas - {course.title} ({course.code})</h1>
            <Link to={`/admin/courses/${course.id}/enrollments`} style={{ marginLeft: '15px' }}> {/* Link to enrollments page */}
                <button className={styles.enrollButton}>Inscrever Alunos</button>
            </Link>
            <p style={{ marginTop: '10px' }}>Adicione, edite e organize as disciplinas para este curso.</p> {/* Add margin */}
            <hr />
            <AddDisciplineForm courseId={course.id} onDisciplineAdded={handleDisciplineAdded} /> {/* Render the form */}
            <hr />
            <DisciplineList courseId={course.id} ref={disciplineListRef} /> {/* Render DisciplineList */}
        </div>
    );
};

export default AdminDisciplinesPage;