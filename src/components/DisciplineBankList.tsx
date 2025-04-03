import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { supabase } from '../services/supabaseClient';
import styles from './DisciplineBankList.module.css'; // Import styles
import EditDisciplineModal from './EditDisciplineModal'; // Import the modal

interface Discipline {
  id: string;
  title: string;
  number: string | null;
  order: number | null; // Assuming 'order' is still relevant as a general property
  description: string | null; // Assuming description exists or should be added
  created_at: string;
  // updated_at: string; // Add if you have an updated_at column
}

export interface DisciplineBankListHandle {
  refreshDisciplines: () => void;
}

interface DisciplineBankListProps {}

const DisciplineBankListComponent: React.ForwardRefRenderFunction<DisciplineBankListHandle, DisciplineBankListProps> = (_props, ref) => {
  const navigate = useNavigate(); // Initialize navigate hook
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editingDiscipline, setEditingDiscipline] = useState<Discipline | null>(null); // State for modal

  const fetchDisciplines = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all disciplines, ordered as desired (e.g., by number, then title)
      // No need to filter by course_id anymore
      const { data, error: fetchError } = await supabase
        .from('disciplines')
        .select('id, title, number, order, description, created_at') // Add/remove fields as needed
        .order('order', { ascending: true, nullsFirst: false }) // Use nullsFirst: false for NULLS LAST
        .order('number', { ascending: true })
        .order('title', { ascending: true });

      if (fetchError) throw fetchError;

      setDisciplines(data || []);
    } catch (err: any) {
      console.error("Error fetching disciplines:", err);
      setError(err.message || 'Falha ao buscar disciplinas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDisciplines();
  }, [fetchDisciplines]);

  useImperativeHandle(ref, () => ({
    refreshDisciplines() {
      fetchDisciplines();
    }
  }));

  // Navigate to the lesson management page for the given discipline
  const handleManageLessons = (disciplineId: string) => {
    // Update navigation to point to the new associated lessons page
    navigate(`/admin/disciplines/${disciplineId}/associated-lessons`);
  };

  // Open the edit modal with the selected discipline
  const handleEdit = (discipline: Discipline) => {
    // setEditingDiscipline(discipline); // Will be uncommented later
    setEditingDiscipline(discipline);
  };

  const handleDelete = async (disciplineId: string, disciplineTitle: string) => {
    if (window.confirm(`Tem certeza que deseja excluir a disciplina "${disciplineTitle}"? Esta ação não pode ser desfeita e removerá a disciplina de todos os cursos associados.`)) {
      setError(null); // Clear previous errors
      try {
        // RLS should allow admin delete access
        // ON DELETE CASCADE on course_disciplines and lessons should handle cleanup
        const { error: deleteError } = await supabase
          .from('disciplines')
          .delete()
          .eq('id', disciplineId);

        if (deleteError) throw deleteError;

        alert(`Disciplina "${disciplineTitle}" excluída com sucesso.`);
        fetchDisciplines(); // Refresh the list
      } catch (err: any) {
        console.error("Error deleting discipline:", err);
        setError(`Falha ao excluir disciplina: ${err.message}`);
        alert(`Erro ao excluir disciplina: ${err.message}`);
      }
    }
  };

  // Close the edit modal
  const handleCloseModal = () => {
    setEditingDiscipline(null);
  };

  // Refresh the list after a discipline is updated
  const handleDisciplineUpdated = () => {
    fetchDisciplines();
    // Optional: Keep modal open or close it after update
    // handleCloseModal();
  };


  if (loading) return <div className={styles.loadingMessage}>Carregando disciplinas...</div>;
  if (error) return <div className={styles.errorMessage}>Erro: {error}</div>;

  return (
    <div className={styles.listContainer}>
      <h2>Disciplinas no Banco</h2>
      {disciplines.length === 0 ? (
        <p className={styles.noItemsMessage}>Nenhuma disciplina encontrada no banco.</p>
      ) : (
        <ul /* className={styles.list} */> {/* Assuming no specific list style needed */}
          {disciplines.map(discipline => (
            <li key={discipline.id} className={styles.listItem}>
              <div className={styles.contentGroup}>
                <strong>{discipline.number ? `${discipline.number}. ` : ''}{discipline.title}</strong>
                {/* Optional: Display description or other details */}
                {/* <p>{discipline.description || 'Sem descrição.'}</p> */}
                <small> (Ordem: {discipline.order ?? 'N/A'})</small>
                <small> Criado em: {new Date(discipline.created_at).toLocaleDateString()}</small>
              </div>
              <div className={styles.actionsContainer}>
                 {/* TODO: Add Link to manage lessons for this discipline */}
                 {/* Update button text for clarity */}
                 <button onClick={() => handleManageLessons(discipline.id)}>Gerenciar Aulas Associadas</button>
                 <button onClick={() => handleEdit(discipline)}>Editar</button>
                 <button onClick={() => handleDelete(discipline.id, discipline.title)}>Excluir</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {/* Render EditDisciplineModal */}
      <EditDisciplineModal
        discipline={editingDiscipline}
        onClose={handleCloseModal}
        onDisciplineUpdated={handleDisciplineUpdated}
      />
    </div>
  );
};

const DisciplineBankList = forwardRef(DisciplineBankListComponent);

export default DisciplineBankList;