import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
// import { useNavigate } from 'react-router-dom'; // Não necessário aqui, talvez no EditLessonModal
import { supabase } from '../services/supabaseClient';
import styles from './LessonBankList.module.css'; // Será criado
import EditLessonModal from './EditLessonModal'; // Será criado

interface Lesson {
  id: string;
  title: string;
  number: string | null;
  order: number | null;
  content: string | null; // Incluir para possível exibição ou edição
  video_url: string | null; // Incluir para possível exibição ou edição
  created_at: string;
  // updated_at: string; // Adicionar se existir
}

export interface LessonBankListHandle {
  refreshLessons: () => void;
}

interface LessonBankListProps {}

const LessonBankListComponent: React.ForwardRefRenderFunction<LessonBankListHandle, LessonBankListProps> = (_props, ref) => {
  // const navigate = useNavigate(); // Não usado diretamente aqui
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null); // State for modal

  const fetchLessons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all lessons, ordered as desired
      const { data, error: fetchError } = await supabase
        .from('lessons')
        .select('id, title, number, order, content, video_url, created_at') // Selecionar todos os campos relevantes
        .order('order', { ascending: true, nullsFirst: false }) // Use nullsFirst: false for NULLS LAST
        .order('number', { ascending: true })
        .order('title', { ascending: true });

      if (fetchError) throw fetchError;

      setLessons(data || []);
    } catch (err: any) {
      console.error("Error fetching lessons from bank:", err);
      setError(err.message || 'Falha ao buscar aulas do banco.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  useImperativeHandle(ref, () => ({
    refreshLessons() {
      fetchLessons();
    }
  }));

  // Open the edit modal with the selected lesson
  const handleEdit = (lesson: Lesson) => {
    setEditingLesson(lesson);
  };

  const handleDelete = async (lessonId: string, lessonTitle: string) => {
    if (window.confirm(`Tem certeza que deseja excluir a aula "${lessonTitle}" do banco? Esta ação não pode ser desfeita e removerá a aula de todas as disciplinas associadas.`)) {
      setError(null); // Clear previous errors
      try {
        // RLS should allow admin delete access
        // ON DELETE CASCADE on discipline_lessons should handle cleanup
        const { error: deleteError } = await supabase
          .from('lessons')
          .delete()
          .eq('id', lessonId);

        if (deleteError) throw deleteError;

        alert(`Aula "${lessonTitle}" excluída com sucesso.`);
        fetchLessons(); // Refresh the list
      } catch (err: any) {
        console.error("Error deleting lesson:", err);
        setError(`Falha ao excluir aula: ${err.message}`);
        alert(`Erro ao excluir aula: ${err.message}`);
      }
    }
  };

  // Close the edit modal
  const handleCloseModal = () => {
    setEditingLesson(null);
  };

  // Refresh the list after a lesson is updated
  const handleLessonUpdated = () => {
    fetchLessons();
    // Optional: Keep modal open or close it after update
    // handleCloseModal();
  };


  if (loading) return <div className={styles.loadingMessage}>Carregando aulas...</div>;
  if (error) return <div className={styles.errorMessage}>Erro: {error}</div>;

  return (
    <div className={styles.listContainer}>
      <h2>Aulas no Banco</h2>
      {lessons.length === 0 ? (
        <p className={styles.noItemsMessage}>Nenhuma aula encontrada no banco.</p>
      ) : (
        <ul className={styles.list}> {/* Apply list style */}
          {lessons.map(lesson => (
            <li key={lesson.id} className={styles.listItem}>
              <div className={styles.contentGroup}>
                <strong>{lesson.title}</strong> {/* Removed number display */}
                {/* Optional: Display snippet of content or video URL */}
                {/* <p>{lesson.content?.substring(0, 50) ?? ''}... </p> */}
                {lesson.video_url && <small> (Vídeo/PDF: <a href={lesson.video_url} target="_blank" rel="noopener noreferrer">Link</a>)</small>}
                <small> (Ordem: {lesson.order ?? 'N/A'})</small>
                <small> Criado em: {new Date(lesson.created_at).toLocaleDateString()}</small>
              </div>
              <div className={styles.actionsContainer}>
                 {/* Link para gerenciar associações pode ser adicionado aqui ou na página de disciplinas */}
                 {/* <button>Gerenciar Associações</button> */}
                 <button onClick={() => handleEdit(lesson)} className={styles.editButton}>Editar</button>
                 <button onClick={() => handleDelete(lesson.id, lesson.title)} className={styles.deleteButton}>Excluir</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {/* Render EditLessonModal */}
      <EditLessonModal
        lesson={editingLesson}
        onClose={handleCloseModal}
        onLessonUpdated={handleLessonUpdated} // Renomear callback se necessário
      />
    </div>
  );
};

const LessonBankList = forwardRef(LessonBankListComponent);

export default LessonBankList;