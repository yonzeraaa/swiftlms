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

interface ProfileInfo {
    email: string | null;
    full_name: string | null;
}

interface ActivityLogEntry {
    id: string;
    user_id: string;
    action_type: string;
    target_id: string | null;
    target_type: string | null;
    details: Record<string, any> | null;
    created_at: string;
    admin_email: string | null;
    admin_full_name: string | null;
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

    // --- Data Fetching Callbacks ---
    const fetchStats = useCallback(async () => {
        // ... (fetchStats logic remains the same)
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
        setActivityLoading(true);
        setActivityError(null);
        const offset = (page - 1) * ACTIVITY_PAGE_SIZE;

        try {
            const { data, error } = await supabase.rpc(
                'get_recent_activity_with_profiles',
                {
                    page_limit: ACTIVITY_PAGE_SIZE,
                    page_offset: offset
                }
            );

            if (error) throw error;

            const fetchedData = data || [];
            setRecentActivity(fetchedData);
            // Check if this is the last page
            setIsLastPage(fetchedData.length < ACTIVITY_PAGE_SIZE);

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
    }, []); // Removed currentPage dependency, pass page as argument

    // --- Effects ---
    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    useEffect(() => {
        // Fetch activity for the current page whenever currentPage changes
        fetchRecentActivity(currentPage);
    }, [currentPage, fetchRecentActivity]); // Add fetchRecentActivity dependency

    // --- Event Handlers ---
    const handleNextPage = () => {
        if (!isLastPage) {
            setCurrentPage(prevPage => prevPage + 1);
        }
    };

    const handlePrevPage = () => {
        setCurrentPage(prevPage => Math.max(1, prevPage - 1)); // Ensure page doesn't go below 1
    };

    // --- Helper to render activity log item ---
    const renderActivityItem = (activity: ActivityLogEntry) => {
        // ... (renderActivityItem logic remains the same)
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

            {/* Recent Activity Section (Updated with Pagination) */}
            <div className={styles.activitySection}>
                <h2>Atividade Recente</h2>
                {activityLoading && <p>Carregando atividade...</p>}
                {activityError && <p className={styles.errorMessage}>Erro ao carregar atividade: {activityError}</p>}
                {!activityLoading && !activityError && (
                    recentActivity.length === 0 && currentPage === 1 ? ( // Show only if no results on page 1
                        <p>Nenhuma atividade recente encontrada.</p>
                    ) : (
                        <>
                            <ul className={styles.activityList}>
                                {recentActivity.map(renderActivityItem)}
                            </ul>
                            {/* Pagination Controls */}
                            <div className={styles.paginationControls}>
                                <button onClick={handlePrevPage} disabled={currentPage === 1 || activityLoading}>
                                    Anterior
                                </button>
                                <span>Página {currentPage}</span>
                                <button onClick={handleNextPage} disabled={isLastPage || activityLoading}>
                                    Próxima
                                </button>
                            </div>
                        </>
                    )
                )}
            </div>
        </div>
    );
};

export default AdminOverviewPage;