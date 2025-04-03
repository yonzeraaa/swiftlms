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
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]); // Renamed state variable
    const [enrolledUserIds, setEnrolledUserIds] = useState<Set<string>>(new Set()); // Renamed state variable
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState<Record<string, boolean>>({}); // Track saving state per user

    // Fetch Course Details, All Users, and Current Enrollments
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

            // Process Users Result
            if (studentsResult.error) throw new Error(`Falha ao buscar usuários: ${studentsResult.error.message}`);
            // No longer filter by role, include all users (admins and students)
            const users = (studentsResult.data as UserProfile[] || []);
            setAllUsers(users); // Update state with all users

            // Process Enrollments Result
            if (enrollmentsResult.error) throw new Error(`Falha ao buscar inscrições: ${enrollmentsResult.error.message}`);
            const enrolledIds = new Set(enrollmentsResult.data?.map(e => e.user_id) || []);
            setEnrolledUserIds(enrolledIds); // Update state with enrolled user IDs

        } catch (err: any) {
            console.error("Error fetching enrollment data:", err);
            setError(err.message || 'Falha ao carregar dados de inscrição.');
            setCourse(null);
            setAllUsers([]); // Clear all users state on error
            setEnrolledUserIds(new Set()); // Clear enrolled IDs state on error
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Handle checkbox change (enroll/unenroll)
    // Renamed parameter from studentId to userId for clarity
    const handleEnrollmentChange = async (userId: string, isCurrentlyEnrolled: boolean) => {
        setSaving(prev => ({ ...prev, [userId]: true })); // Set saving state for this user
        setError(null); // Clear previous errors

        try {
            if (isCurrentlyEnrolled) {
                // Unenroll: Delete from enrollments table
                // Unenroll: Delete from enrollments table
                console.log(`Attempting to unenroll user ${userId} from course ${courseId}`);
                const { error: deleteError } = await supabase
                    .from('enrollments')
                    .delete()
                    .eq('user_id', userId) // Use userId
                    .eq('course_id', courseId);

                if (deleteError) throw deleteError;
                console.log(`User ${userId} unenrolled successfully.`);
                setEnrolledUserIds(prev => { // Update enrolledUserIds state
                    const newSet = new Set(prev);
                    newSet.delete(userId);
                    return newSet;
                });
            } else {
                // Enroll: Insert into enrollments table
                // Enroll: Insert into enrollments table
                 console.log(`Attempting to enroll user ${userId} in course ${courseId}`);
                const { error: insertError } = await supabase
                    .from('enrollments')
                    .insert({ user_id: userId, course_id: courseId }); // Use userId

                if (insertError) throw insertError;
                 console.log(`User ${userId} enrolled successfully.`);
                setEnrolledUserIds(prev => new Set(prev).add(userId)); // Update enrolledUserIds state
            }
        } catch (err: any) {
            console.error(`Error updating enrollment for user ${userId}:`, err);
            setError(`Falha ao ${isCurrentlyEnrolled ? 'remover inscrição' : 'inscrever'} usuário: ${err.message}`);
            // Revert UI state on error? Maybe not necessary if we refetch or show error clearly.
        } finally {
            setSaving(prev => ({ ...prev, [userId]: false })); // Clear saving state for this user
        }
    };


    if (loading) return <div>Carregando dados de inscrição...</div>; // Consider using a spinner component
    if (error) return <div className={styles.errorMessage}>Erro: {error}</div>; // Apply error style
    if (!course) return <div>Curso não encontrado.</div>;

    const backToDisciplinesUrl = `/admin/courses/${course.id}/disciplines`;

    return (
        <div className={styles.pageContainer}> {/* Style already applied */}
            <Link to={backToDisciplinesUrl} className={styles.backLink}>&larr; Voltar para Disciplinas</Link> {/* Style already applied */}
            <h1>Inscrever Usuários - {course.title} ({course.code})</h1>
            <p>Marque os usuários (alunos e administradores) que devem ser inscritos neste curso.</p>

            {/* Error message display handled by the conditional return above */}

            <div className={styles.studentList}> {/* Style already applied */}
                {allUsers.length === 0 && <p>Nenhum usuário encontrado no sistema.</p>}
                {allUsers.map(userItem => { // Renamed map variable
                    const isEnrolled = enrolledUserIds.has(userItem.id); // Check enrolledUserIds
                    const isSaving = saving[userItem.id] || false;
                    return (
                        <div key={userItem.id} className={styles.studentItem}> {/* Keep existing style name for now */}
                            <input
                                type="checkbox"
                                id={`enroll-${userItem.id}`}
                                checked={isEnrolled}
                                onChange={() => handleEnrollmentChange(userItem.id, isEnrolled)}
                                disabled={isSaving}
                            />
                            <label htmlFor={`enroll-${userItem.id}`} className={isSaving ? styles.savingLabel : ''}>
                                {userItem.full_name || userItem.email || userItem.id}
                                {/* Display role for clarity */}
                                <span style={{ marginLeft: '10px', fontSize: '0.8em', color: 'grey' }}>
                                    ({userItem.role === 'admin' ? 'Admin' : userItem.role === 'aluno' ? 'Aluno' : userItem.role})
                                </span>
                                {isSaving && <span className={styles.savingIndicator}> (Salvando...)</span>}
                            </label>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AdminEnrollmentsPage;