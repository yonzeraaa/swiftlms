import React, { useState, useEffect, useCallback } from 'react';
// import { Link } from 'react-router-dom'; // Removed unused import
import { supabase } from '../services/supabaseClient';
import styles from './AdminOverviewPage.module.css';

// --- Interfaces ---
interface Stats {
    studentCount: number;
    courseCount: number;
    enrollmentCount: number;
    adminCount: number;
}

// Interface for the profile data as returned by the join
interface ProfileInfo {
    email: string | null;
    full_name: string | null;
}

// Updated interface for Activity Log entries
interface ActivityLogEntry {
    id: string;
    user_id: string; // Admin who performed the action
    action_type: string; // e.g., 'course_created', 'user_deleted'
    target_id: string | null;
    target_type: string | null; // e.g., 'course', 'user'
    details: Record<string, any> | null; // JSON details
    created_at: string;
    // Expect profile_info as an array from Supabase join
    profile_info: ProfileInfo[] | null;
}


// --- Component ---
const AdminOverviewPage: React.FC = () => {
    // --- State ---
    const [stats, setStats] = useState<Stats | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [statsError, setStatsError] = useState<string | null>(null);

    // State uses the updated interface
    const [recentActivity, setRecentActivity] = useState<ActivityLogEntry[]>([]);
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

    // Updated function to fetch from activity_log with explicit join hint
    const fetchRecentActivity = useCallback(async () => {
        setActivityLoading(true);
        setActivityError(null);
        try {
            // Fetch latest activity logs, joining with profiles using explicit FK hint
            // and aliasing the joined data to profile_info
            const { data, error } = await supabase
                .from('activity_log')
                .select(`
                    id,
                    user_id,
                    action_type,
                    target_id,
                    target_type,
                    details,
                    created_at,
                    profile_info:user_id ( email, full_name )
                `)
                .order('created_at', { ascending: false })
                .limit(15);

            if (error) throw error;

            // Let TypeScript infer the type, handle potential null
            setRecentActivity(data || []);

        } catch (err: any) {
            console.error("Error fetching recent activity log:", err);
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

    // --- Helper to render activity log item ---
    const renderActivityItem = (activity: ActivityLogEntry) => {
        // Safely access the first profile in the profile_info array
        const profile = activity.profile_info && activity.profile_info.length > 0 ? activity.profile_info[0] : null;
        const adminName = profile?.full_name ?? profile?.email ?? 'Admin desconhecido';
        const timestamp = new Date(activity.created_at).toLocaleString();
        let message = `${adminName} `;

        switch (activity.action_type) {
            case 'course_created':
                message += `criou o curso "${activity.details?.course_title ?? 'N/A'}" (${activity.details?.course_code ?? 'N/A'})`;
                break;
            case 'course_updated':
                message += `atualizou o curso "${activity.details?.course_title ?? 'N/A'}"`;
                break;
            case 'course_deleted':
                message += `excluiu o curso "${activity.details?.course_title ?? 'N/A'}" (${activity.details?.course_code ?? 'N/A'})`;
                break;
            case 'user_created':
                message += `criou o usuário "${activity.details?.created_name ?? activity.details?.created_email ?? 'N/A'}"`;
                break;
            case 'user_status_updated':
                message += `atualizou o status do usuário "${activity.details?.target_email ?? 'N/A'}" para ${activity.details?.new_status ?? 'N/A'}`;
                break;
            case 'user_deleted':
                message += `excluiu o usuário "${activity.details?.deleted_email ?? 'N/A'}"`;
                break;
            case 'user_creation_cleanup':
                 message += `limpou o usuário "${activity.details?.deleted_email ?? 'N/A'}" após falha na criação do perfil.`;
                 break;
            default:
                message += `realizou a ação: ${activity.action_type}`;
                if (activity.target_id) message += ` no alvo ${activity.target_type}:${activity.target_id}`;
        }

        return (
            <li key={activity.id} className={styles.activityItem}>
                <span>{message}</span>
                <span className={styles.activityTimestamp}>{timestamp}</span>
            </li>
        );
    };


    // --- Render ---
    return (
        <div className={styles.pageContainer}>
            <h1>Visão Geral</h1>

            {/* Stats Section (Unchanged) */}
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

            {/* Recent Activity Section (Updated) */}
            <div className={styles.activitySection}>
                <h2>Atividade Recente</h2>
                {activityLoading && <p>Carregando atividade...</p>}
                {activityError && <p className={styles.errorMessage}>Erro ao carregar atividade: {activityError}</p>}
                {!activityLoading && !activityError && (
                    recentActivity.length === 0 ? (
                        <p>Nenhuma atividade recente encontrada.</p>
                    ) : (
                        <ul className={styles.activityList}>
                            {recentActivity.map(renderActivityItem)}
                        </ul>
                    )
                )}
            </div>
        </div>
    );
};

export default AdminOverviewPage;