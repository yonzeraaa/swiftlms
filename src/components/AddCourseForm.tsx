// src/components/AddCourseForm.tsx (Updated with Activity Logging)
import React, { useState, useEffect, useCallback } from 'react'; // Import useEffect, useCallback
import { supabase } from '../services/supabaseClient';
import { generateCourseCode } from '../utils/courseUtils';
import { useAuth } from '../contexts/AuthContext'; // Import useAuth
import styles from './AddCourseForm.module.css';

interface AddCourseFormProps {
  onCourseAdded: () => void; // Callback after course and associations are created
}
// Interface for basic discipline data fetched from the bank
interface AvailableDiscipline {
  id: string;
  title: string;
  number: string | null;
}

const AddCourseForm: React.FC<AddCourseFormProps> = ({ onCourseAdded }) => {
  const { user } = useAuth(); // Get the current user
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // Form submission states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // State for fetching and selecting disciplines
  const [availableDisciplines, setAvailableDisciplines] = useState<AvailableDiscipline[]>([]);
  const [selectedDisciplineIds, setSelectedDisciplineIds] = useState<Set<string>>(new Set());
  const [disciplinesLoading, setDisciplinesLoading] = useState<boolean>(true);
  const [disciplinesError, setDisciplinesError] = useState<string | null>(null);
  // Removed duplicate success state declaration from here
  // Fetch available disciplines from the bank
  const fetchAvailableDisciplines = useCallback(async () => {
    setDisciplinesLoading(true);
    setDisciplinesError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('disciplines')
        .select('id, title, number') // Select only needed fields
        .order('number', { ascending: true })
        .order('title', { ascending: true });

      if (fetchError) throw fetchError;
      setAvailableDisciplines(data || []);
    } catch (err: any) {
      console.error("Error fetching available disciplines:", err);
      setDisciplinesError('Falha ao carregar disciplinas disponíveis.');
      setAvailableDisciplines([]);
    } finally {
      setDisciplinesLoading(false);
    }
  }, []);

  // Fetch disciplines on component mount
  useEffect(() => {
    fetchAvailableDisciplines();
  }, [fetchAvailableDisciplines]);

  // Handle checkbox change for selecting disciplines
  const handleDisciplineSelectionChange = (disciplineId: string, isSelected: boolean) => {
    setSelectedDisciplineIds(prevIds => {
      const newIds = new Set(prevIds);
      if (isSelected) {
        newIds.add(disciplineId);
      } else {
        newIds.delete(disciplineId);
      }
      return newIds;
    });
  };


  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) { // Ensure user is logged in
        setError("Usuário não autenticado.");
        return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim() || null;
    const courseCode = generateCourseCode(trimmedTitle);

    if (!trimmedTitle) {
      setError('O título do curso é obrigatório.');
      setLoading(false);
      return;
    }
    if (!courseCode) {
        setError('Não foi possível gerar um código para o título fornecido.');
        setLoading(false);
        return;
    }


    try {
      // Admin role allows insert via RLS policy
      // Modify insert to select the created course ID
      const { data: newCourseData, error: insertError } = await supabase
        .from('courses')
        .insert([{
            title: trimmedTitle,
            description: trimmedDescription,
            code: courseCode
         }])
         .select('id') // Select the ID of the inserted row
         .single(); // Expect only one row back

      if (insertError) {
        if (insertError.message.includes('courses_code_key')) {
             throw new Error(`O código gerado '${courseCode}' já existe. Tente um título ligeiramente diferente.`);
        }
        throw insertError;
      }

      if (!newCourseData || !newCourseData.id) {
          throw new Error('Falha ao obter o ID do curso recém-criado.');
      }

      const newCourseId = newCourseData.id;

      // --- Associate selected disciplines ---
      let associationError: string | null = null;
      if (selectedDisciplineIds.size > 0) {
        const associations = Array.from(selectedDisciplineIds).map(disciplineId => ({
          course_id: newCourseId,
          discipline_id: disciplineId,
        }));

        console.log("Attempting to insert associations:", associations); // Debug log

        const { error: associationInsertError } = await supabase
          .from('course_disciplines')
          .insert(associations);

        if (associationInsertError) {
          console.error("Error inserting course-discipline associations:", associationInsertError);
          // Don't throw here, but record the error to show the user
          associationError = `Falha ao associar disciplinas: ${associationInsertError.message}`;
          // Optional: Attempt to delete the course if associations failed? Or just warn user.
          // For now, just warn.
        } else {
           console.log("Associations inserted successfully."); // Debug log
        }
      }
      // --- End Association ---


      // Log the activity (consider adding associated discipline count/ids)
      const logDetails: Record<string, any> = {
          course_title: trimmedTitle,
          course_code: courseCode,
          associated_disciplines_count: selectedDisciplineIds.size
      };
      // Optionally add IDs if needed, but might be too much detail for log
      // if (selectedDisciplineIds.size > 0) {
      //     logDetails.associated_discipline_ids = Array.from(selectedDisciplineIds);
      // }

      const { error: logError } = await supabase.from('activity_log').insert({
          user_id: user.id,
          action_type: 'course_created',
          target_id: newCourseId,
          target_type: 'course',
          details: logDetails
      });

      if (logError) {
          console.error("Error logging course creation activity:", logError);
          // Don't block user flow, just log the error
      }

      // Update success message based on association outcome
      if (associationError) {
          setError(associationError); // Show association error prominently
          setSuccess(`Curso "${trimmedTitle}" criado, mas houve um erro ao associar disciplinas.`);
      } else {
          setSuccess(`Curso "${trimmedTitle}" (${courseCode}) e ${selectedDisciplineIds.size} disciplina(s) associada(s) com sucesso!`);
      }

      // This line is redundant because of the logic above setting success/error based on association outcome
      // setSuccess(`Curso "${trimmedTitle}" (${courseCode}) adicionado com sucesso!`);
      setTitle(''); // Clear form
      setDescription('');
      setSelectedDisciplineIds(new Set()); // Clear selected disciplines
      onCourseAdded(); // Trigger refresh in parent
    } catch (err: any) {
      console.error("Error adding course:", err);
      setError(err.message || 'Falha ao adicionar curso.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <h2>Adicionar Novo Curso</h2>
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label htmlFor="courseTitle">Título:</label>
          <input
            type="text"
            id="courseTitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={loading}
            placeholder="Ex: Construção Naval e Offshore"
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="courseDescription">Descrição:</label>
          <textarea
            id="courseDescription"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
            placeholder="Uma breve descrição do curso"
          />
        </div>

        {/* Discipline Selection Section */}
        <div className={styles.formGroup}>
           <label>Associar Disciplinas (Opcional):</label>
           {disciplinesLoading && <p>Carregando disciplinas...</p>}
           {disciplinesError && <p className={styles.errorMessage}>{disciplinesError}</p>}
           {!disciplinesLoading && !disciplinesError && (
               availableDisciplines.length === 0 ? (
                   <p>Nenhuma disciplina encontrada no banco para associar.</p>
               ) : (
                   <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--border-radius-sm)', padding: '10px' }}>
                       {availableDisciplines.map(discipline => (
                           <div key={discipline.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                               <input
                                   type="checkbox"
                                   id={`discipline-select-${discipline.id}`}
                                   checked={selectedDisciplineIds.has(discipline.id)}
                                   onChange={(e) => handleDisciplineSelectionChange(discipline.id, e.target.checked)}
                                   disabled={loading} // Disable while main form is submitting
                                   style={{ marginRight: '8px', cursor: 'pointer' }}
                               />
                               <label htmlFor={`discipline-select-${discipline.id}`} style={{ fontWeight: 'normal', cursor: 'pointer' }}>
                                   {discipline.number ? `${discipline.number}. ` : ''}{discipline.title}
                               </label>
                           </div>
                       ))}
                   </div>
               )
           )}
        </div>
        <button type="submit" disabled={loading} className={styles.submitButton}>
          {loading ? 'Adicionando...' : 'Adicionar Curso'}
        </button>
        {error && <p className={styles.errorMessage}>Erro: {error}</p>}
        {success && <p className={styles.successMessage}>{success}</p>}
      </form>
    </div>
  );
};

export default AddCourseForm;