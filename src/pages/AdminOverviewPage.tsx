import React, { useState, useEffect, useCallback } from 'react';
// import { Link } from 'react-router-dom'; // Removed unused import
import { supabase } from '../services/supabaseClient';
import styles from './AdminOverviewPage.module.css';

// --- Constants ---
const ACTIVITY_PAGE_SIZE = 20;

// --- Interfaces ---
interface Stats {
    studentCount: number;
    courseCount: number;
    enrollmentCount: number;
    adminCount: number;
}

// interface ProfileInfo { // Removed unused interface
//     email: string | null;
//     full_name: string | null;
// }

interface ActivityLogEntry {
    id: string;
    user_id: string;
    action_type: string;
    target_id: string | null;
    target_type: string | null;
    details: Record<string, any> | null;
    created_at: string;
    admin_email: string | null; // Email of the admin who performed the action
    admin_full_name: string | null; // Full name of the admin
}


// --- Component ---
const AdminOverviewPage: React.FC = () => {
    // --- State ---
    const [stats, setStats] = useState<Stats | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [statsError, setStatsError] = useState<string | null>(null);

    const [recentActivity, setRecentActivity] = useState<ActivityLogEntry[]>([]);
    const [activityLoading, setActivityLoading] = useState(true);
    const [activityError, setActivityError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1); // Start at page 1
    const [isLastPage, setIsLastPage] = useState(false); // Track if on the last page
    // Unused state removed

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

    // Updated function to call the RPC with pagination
    const fetchRecentActivity = useCallback(async (page: number) => {
        console.log(`[fetchRecentActivity] Fetching page ${page}`); // DEBUG
        setActivityLoading(true);
        setActivityError(null);
        const offset = (page - 1) * ACTIVITY_PAGE_SIZE;

        try {
            const { data, error, count } = await supabase.rpc( // Add count if your RPC supports it, otherwise remove
                'get_recent_activity_with_profiles',
                {
                    page_limit: ACTIVITY_PAGE_SIZE,
                    page_offset: offset
                },
                // { count: 'exact' } // Optional: If you modify RPC to return total count
            );

            console.log('[fetchRecentActivity] RPC Response:', { data, error, count }); // DEBUG

            if (error) throw error;

            const fetchedData = data || [];
            setRecentActivity(fetchedData);
            setIsLastPage(fetchedData.length < ACTIVITY_PAGE_SIZE);
            // if (count !== null) setTotalActivityCount(count); // Removed unused state update

            console.log('[fetchRecentActivity] State updated:', { fetchedData, isLastPage }); // DEBUG

        } catch (err: any) {
            console.error("Error fetching recent activity log via RPC:", err);
            if (err.message.includes('function public.get_recent_activity_with_profiles')) {
                 setActivityError('Erro: A função necessária para buscar atividades não foi encontrada no banco de dados.');
            } else {
                 setActivityError(err.message || 'Falha ao buscar atividade recente.');
            }
            setRecentActivity([]);
            setIsLastPage(true); // Assume last page on error
        } finally {
            setActivityLoading(false);
        }
    }, []);

    // --- Effects ---
    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    useEffect(() => {
        fetchRecentActivity(currentPage);
    }, [currentPage, fetchRecentActivity]);

    // --- Event Handlers ---
    const handleNextPage = () => {
        if (!isLastPage) {
            setCurrentPage(prevPage => prevPage + 1);
        }
    };

    const handlePrevPage = () => {
        setCurrentPage(prevPage => Math.max(1, prevPage - 1));
    };

    // --- Helper to render activity log item ---
    const renderActivityItem = (activity: ActivityLogEntry) => {
        const adminName = activity.admin_full_name ?? activity.admin_email ?? 'Admin desconhecido';
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
    // Determine if pagination should be shown
    const showPagination = !activityLoading && !activityError && (currentPage > 1 || !isLastPage);

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

            {/* Recent Activity Section */}
            <div className={styles.activitySection}>
                <h2>Atividade Recente</h2>
                {activityLoading && <p>Carregando atividade...</p>}
                {activityError && <p className={styles.errorMessage}>Erro ao carregar atividade: {activityError}</p>}

                {/* List Rendering */}
                {!activityLoading && !activityError && recentActivity.length > 0 && (
                    <ul className={styles.activityList}>
                        {recentActivity.map(renderActivityItem)}
                    </ul>
                )}

                {/* No Activity Message */}
                {!activityLoading && !activityError && recentActivity.length === 0 && currentPage === 1 && (
                    <p>Nenhuma atividade recente encontrada.</p>
                )}

                {/* Pagination Controls - Render based on showPagination flag */}
                {showPagination && (
                    <div className={styles.paginationControls}>
                        <button onClick={handlePrevPage} disabled={currentPage === 1 || activityLoading}>
                            Anterior
                        </button>
                        <span>Página {currentPage}</span>
                        <button onClick={handleNextPage} disabled={isLastPage || activityLoading}>
                            Próxima
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminOverviewPage;