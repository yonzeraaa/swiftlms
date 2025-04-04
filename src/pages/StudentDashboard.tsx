import React, { useEffect, useCallback } from 'react'; // Removed useState
// Removed unused Link import
import { useAuth } from '../contexts/AuthContext';
// Removed unused supabase import
import styles from './StudentDashboard.module.css';

// Removed unused Course interfaces
// Removed unused interfaces

const StudentDashboard: React.FC = () => {
    const { user } = useAuth();
    // Removed summaryCourses state
    // Removed unused state variables
    // Removed unused loading and error states

    const fetchDashboardData = useCallback(async () => {
        if (!user) {
            // setLoading(false); // Removed call
            return;
        }
        // Reset states
        // Removed setLoading and setError calls
        // Removed summaryCourses reset

        try {
            // Placeholder for future dashboard data fetching (e.g., notifications)
            // Currently, only fetches last viewed from localStorage in useEffect
            console.log("Fetching dashboard data (currently only last viewed from localStorage)...");

        } catch (err: any) {
            console.error("Error fetching dashboard data:", err);
            // Removed setError call
        } finally {
            // Removed setLoading call
        }
    }, [user]);

    useEffect(() => {
        fetchDashboardData();

        // Removed localStorage logic for lastViewed
    }, [fetchDashboardData]); // Run when fetchDashboardData changes (which depends on user)

    return (
        <div className={styles.dashboardContainer}>
            <h1>Meu Painel</h1>
            {user && <p className={styles.welcomeMessage}>Bem-vindo, {user.email}!</p>}
            <hr />

            {/* Removed Continue Learning Section */}

            {/* Removed Course Progress Summary Section */}

             {/* Placeholder for other potential widgets */}
             {/* <div className={styles.widget}>
                 <h2>Notificações</h2>
                 <p>Nenhuma notificação nova.</p>
             </div> */}

        </div>
    );
};

export default StudentDashboard;