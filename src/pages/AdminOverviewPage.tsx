import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import styles from './AdminOverviewPage.module.css';

// --- Interfaces ---
interface Stats {
    studentCount: number;
    courseCount: number;
    enrollmentCount: number;
    adminCount: number;
}

interface RecentUser {
    email: string | null;
    created_at: string;
    full_name: string | null; // Add full_name
}

// Adjust RecentEnrollment interface based on TS error feedback
interface RecentEnrollment {
    user_id: string;
    // Supabase might return courses as an array even for a single relationship
    courses: Array<{
        id: string;
        title: string | null;
    }> | null;
}

interface Profile {
    id: string;
    email: string | null; // Keep email in case name is null
    full_name: string | null; // Add full_name
}

interface ActivityItem {
    type: 'newUser' | 'newEnrollment';
    data: any; // Keep as any for simplicity, refine if needed
    timestamp: Date;
}

// --- Component ---
const AdminOverviewPage: React.FC = () => {
    // --- State ---
    const [stats, setStats] = useState<Stats | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [statsError, setStatsError] = useState<string | null>(null);

    const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
    const [activityLoading, setActivityLoading] = useState(true);
    const [activityError, setActivityError] = useState<string | null>(null);

    // --- Data Fetching Callbacks ---
    const fetchStats = useCallback(async () => {
        setStatsLoading(true);
        setStatsError(null);
        try {
            const { data, error: rpcError } = await supabase.rpc('get_platform_stats');
            if (rpcError) throw rpcError;
            if (!data) throw new Error('Nenhuma estatística retornada.');
            setStats({
                studentCount: data.studentCount ?? 0,
                courseCount: data.courseCount ?? 0,
                enrollmentCount: data.enrollmentCount ?? 0,
                adminCount: data.adminCount ?? 0,
            });
        } catch (err: any) {
            console.error("Error fetching overview stats:", err);
            setStatsError(err.message || 'Falha ao buscar estatísticas.');
            setStats(null);
        } finally {
            setStatsLoading(false);
        }
    }, []);

    const fetchRecentActivity = useCallback(async () => {
        setActivityLoading(true);
        setActivityError(null);
        try {
            // Fetch recent users and enrollments concurrently
            const [usersResult, enrollmentsResult, profilesResult] = await Promise.all([
                supabase
                    .from('profiles')
                    .select('email, created_at, full_name') // Select full_name as well
                    .order('created_at', { ascending: false })
                    .limit(5),
                supabase
                    .from('enrollments')
                    .select('user_id, courses(id, title)')
                    .limit(5), // Order might need a timestamp if added later
                supabase.functions.invoke('get-all-profiles') // Fetch all profiles via function
            ]);

            // Process Users
            if (usersResult.error) throw usersResult.error;
            const recentUsers: RecentUser[] = usersResult.data || [];

            // Process Enrollments and Profiles
            if (enrollmentsResult.error) throw enrollmentsResult.error;
            // Assign fetched data, TS should infer the type based on the select
            const recentEnrollmentsData = enrollmentsResult.data || [];

            // Create a map for user names (and fallback to email)
            let userNameMap = new Map<string, string>();
            if (profilesResult.error) {
                 console.warn("Error invoking get-all-profiles function:", profilesResult.error);
            } else if (profilesResult.data) {
                 userNameMap = new Map(
                    (profilesResult.data as Profile[]).map(p => [p.id, p.full_name ?? p.email ?? 'N/A']) // Use full_name, fallback to email
                 );
            }

            // Combine and format activity data
            const combinedActivity: ActivityItem[] = [
                ...recentUsers.map(u => ({
                    type: 'newUser' as const, // Use const assertion for type safety
                    data: u,
                    timestamp: new Date(u.created_at)
                })),
                ...recentEnrollmentsData.map(e => {
                    // Handle courses potentially being an array
                    const courseInfo = Array.isArray(e.courses) ? e.courses[0] : e.courses;
                    return {
                        type: 'newEnrollment' as const,
                        data: {
                            user_id: e.user_id,
                            courses: courseInfo,
                            // Look up user name (fallback to email/N/A)
                            user_name: userNameMap.get(e.user_id) ?? 'N/A'
                        },
                        timestamp: new Date() // Placeholder timestamp
                    };
                })
            ]
            // Sort only if timestamps are reliable across types, otherwise consider separate lists
            // .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
             .slice(0, 10); // Limit total combined items

            setRecentActivity(combinedActivity);

        } catch (err: any) {
            console.error("Error fetching recent activity:", err);
            setActivityError(err.message || 'Falha ao buscar atividade recente.');
            setRecentActivity([]);
        } finally {
            setActivityLoading(false);
        }
    }, []);

    // --- Effects ---
    useEffect(() => {
        fetchStats();
        fetchRecentActivity();
    }, [fetchStats, fetchRecentActivity]);

    // --- Render ---
    return (
        <div className={styles.pageContainer}>
            <h1>Visão Geral</h1>

            {/* Stats Section */}
            {statsLoading && <p>Carregando estatísticas...</p>}
            {statsError && <p className={styles.errorMessage}>Erro ao carregar estatísticas: {statsError}</p>}
            {stats && !statsLoading && (
                 <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <h2>{stats.studentCount}</h2>
                        <p>Alunos</p>
                    </div>
                    <div className={styles.statCard}>
                        <h2>{stats.courseCount}</h2>
                        <p>Cursos</p>
                    </div>
                    <div className={styles.statCard}>
                        <h2>{stats.enrollmentCount}</h2>
                        <p>Inscrições</p>
                    </div>
                     <div className={styles.statCard}>
                        <h2>{stats.adminCount}</h2>
                        <p>Administradores</p>
                    </div>
                </div>
            )}

            <hr />

            {/* Recent Activity Section */}
            <div className={styles.activitySection}>
                <h2>Atividade Recente</h2>
                {activityLoading && <p>Carregando atividade...</p>}
                {activityError && <p className={styles.errorMessage}>Erro ao carregar atividade: {activityError}</p>}
                {!activityLoading && !activityError && (
                    recentActivity.length === 0 ? (
                        <p>Nenhuma atividade recente encontrada.</p>
                    ) : (
                        <ul className={styles.activityList}>
                            {recentActivity.map((activity, index) => (
                                <li key={index} className={styles.activityItem}>
                                    {activity.type === 'newUser' && (
                                        // Display full_name, fallback to email
                                        <span>Novo usuário registrado: <strong>{activity.data.full_name ?? activity.data.email ?? 'N/A'}</strong></span>
                                    )}
                                    {activity.type === 'newEnrollment' && (
                                        <span>
                                            Nova inscrição: Usuário <strong>{activity.data.user_name}</strong> no curso{' '}
                                            <Link to={`/admin/courses/${activity.data.courses?.id}/disciplines`}>
                                                <strong>{activity.data.courses?.title ?? 'N/A'}</strong>
                                            </Link>
                                        </span>
                                    )}
                                    {/* Display timestamp only for users where we know it's accurate */}
                                    {activity.type === 'newUser' && (
                                        <span className={styles.activityTimestamp}>{activity.timestamp.toLocaleString()}</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )
                )}
            </div>
        </div>
    );
};

export default AdminOverviewPage;