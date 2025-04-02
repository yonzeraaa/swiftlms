// src/pages/AdminEnrollmentsPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import styles from './AdminEnrollmentsPage.module.css'; // Ensure only one import

interface Course {
    id: string;
    title: string;
    code: string | null;
}

interface UserProfile { // Using the profile structure
    id: string;
    email: string | null;
    full_name: string | null;
    role: string | null;
}
/* // Commented out as it's currently unused
interface Enrollment {
    id: string;
    user_id: string;
    course_id: string;
}
*/
// Removed extra closing brace

const AdminEnrollmentsPage: React.FC = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const [course, setCourse] = useState<Course | null>(null);
    const [allStudents, setAllStudents] = useState<UserProfile[]>([]);
    const [enrolledStudentIds, setEnrolledStudentIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState<Record<string, boolean>>({}); // Track saving state per student

    // Fetch Course Details, All Students, and Current Enrollments
    const fetchData = useCallback(async () => {
        if (!courseId) {
            setError("ID do curso não encontrado na URL.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        setSaving({}); // Reset saving states

        try {
            // Use Promise.all for concurrent fetching
            const [courseResult, studentsResult, enrollmentsResult] = await Promise.all([
                // Fetch course details
                supabase.from('courses').select('id, title, code').eq('id', courseId).single(),
                // Fetch all users (students) via Edge Function
                supabase.functions.invoke('get-all-profiles'),
                // Fetch current enrollments for this course
                supabase.from('enrollments').select('user_id').eq('course_id', courseId)
            ]);

            // Process Course Result
            if (courseResult.error) throw new Error(`Falha ao buscar curso: ${courseResult.error.message}`);
            if (!courseResult.data) throw new Error("Curso não encontrado.");
            setCourse(courseResult.data);

            // Process Students Result
            if (studentsResult.error) throw new Error(`Falha ao buscar alunos: ${studentsResult.error.message}`);
            // Filter only students (role === 'aluno') from the result
            const students = (studentsResult.data as UserProfile[] || []).filter(u => u.role === 'aluno');
            setAllStudents(students);

            // Process Enrollments Result
            if (enrollmentsResult.error) throw new Error(`Falha ao buscar inscrições: ${enrollmentsResult.error.message}`);
            const enrolledIds = new Set(enrollmentsResult.data?.map(e => e.user_id) || []);
            setEnrolledStudentIds(enrolledIds);

        } catch (err: any) {
            console.error("Error fetching enrollment data:", err);
            setError(err.message || 'Falha ao carregar dados de inscrição.');
            setCourse(null);
            setAllStudents([]);
            setEnrolledStudentIds(new Set());
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Handle checkbox change (enroll/unenroll)
    const handleEnrollmentChange = async (studentId: string, isCurrentlyEnrolled: boolean) => {
        setSaving(prev => ({ ...prev, [studentId]: true })); // Set saving state for this student
        setError(null); // Clear previous errors

        try {
            if (isCurrentlyEnrolled) {
                // Unenroll: Delete from enrollments table
                console.log(`Attempting to unenroll student ${studentId} from course ${courseId}`);
                const { error: deleteError } = await supabase
                    .from('enrollments')
                    .delete()
                    .eq('user_id', studentId)
                    .eq('course_id', courseId); // Ensure both match

                if (deleteError) throw deleteError;
                console.log(`Student ${studentId} unenrolled successfully.`);
                setEnrolledStudentIds(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(studentId);
                    return newSet;
                });
            } else {
                // Enroll: Insert into enrollments table
                 console.log(`Attempting to enroll student ${studentId} in course ${courseId}`);
                const { error: insertError } = await supabase
                    .from('enrollments')
                    .insert({ user_id: studentId, course_id: courseId });

                if (insertError) throw insertError;
                 console.log(`Student ${studentId} enrolled successfully.`);
                setEnrolledStudentIds(prev => new Set(prev).add(studentId));
            }
        } catch (err: any) {
            console.error(`Error updating enrollment for student ${studentId}:`, err);
            setError(`Falha ao ${isCurrentlyEnrolled ? 'remover inscrição' : 'inscrever'} aluno: ${err.message}`);
            // Revert UI state on error? Maybe not necessary if we refetch or show error clearly.
        } finally {
            setSaving(prev => ({ ...prev, [studentId]: false })); // Clear saving state
        }
    };


    if (loading) return <div>Carregando dados de inscrição...</div>; // Consider using a spinner component
    if (error) return <div className={styles.errorMessage}>Erro: {error}</div>; // Apply error style
    if (!course) return <div>Curso não encontrado.</div>;

    const backToDisciplinesUrl = `/admin/courses/${course.id}/disciplines`;

    return (
        <div className={styles.pageContainer}> {/* Style already applied */}
            <Link to={backToDisciplinesUrl} className={styles.backLink}>&larr; Voltar para Disciplinas</Link> {/* Style already applied */}
            <h1>Inscrever Alunos - {course.title} ({course.code})</h1>
            <p>Marque os alunos que devem ser inscritos neste curso.</p>

            {/* Error message display handled by the conditional return above */}

            <div className={styles.studentList}> {/* Style already applied */}
                {allStudents.length === 0 && <p>Nenhum aluno encontrado no sistema.</p>}
                {allStudents.map(student => {
                    const isEnrolled = enrolledStudentIds.has(student.id);
                    const isSaving = saving[student.id] || false;
                    return (
                        <div key={student.id} className={styles.studentItem}> {/* Style already applied */}
                            <input
                                type="checkbox"
                                id={`enroll-${student.id}`}
                                checked={isEnrolled}
                                onChange={() => handleEnrollmentChange(student.id, isEnrolled)}
                                disabled={isSaving}
                            />
                            <label htmlFor={`enroll-${student.id}`} className={isSaving ? styles.savingLabel : ''}> {/* Style already applied */}
                                {student.full_name || student.email || student.id}
                                {isSaving && <span className={styles.savingIndicator}> (Salvando...)</span>} {/* Style already applied */}
                            </label>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AdminEnrollmentsPage;