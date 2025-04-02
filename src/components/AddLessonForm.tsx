// src/components/AddLessonForm.tsx
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import styles from './AddLessonForm.module.css'; // Import styles

interface AddLessonFormProps {
  disciplineId: string; // ID of the discipline to add the lesson to
  onLessonAdded: () => void; // Callback to refresh the list
}

const AddLessonForm: React.FC<AddLessonFormProps> = ({ disciplineId, onLessonAdded }) => {
  const [title, setTitle] = useState('');
  const [number, setNumber] = useState(''); // Store as string "01", "02" etc.
  const [content, setContent] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [order, setOrder] = useState<number | ''>(''); // Optional explicit order
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Helper to format number (e.g., 1 -> "01", 10 -> "10")
  const formatNumber = (numStr: string): string => {
    const num = parseInt(numStr, 10);
    if (isNaN(num) || num <= 0) return '';
    return num < 10 ? `0${num}` : `${num}`;
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    if (/^\d*$/.test(rawValue)) {
        setNumber(rawValue);
    }
  };

  const handleNumberBlur = () => {
    setNumber(formatNumber(number));
  };

   const handleOrderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setOrder(val === '' ? '' : parseInt(val, 10));
  };


  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formattedNumber = formatNumber(number);
    const finalOrder = order === '' ? null : order;
    const finalVideoUrl = videoUrl.trim() || null;

    if (!title.trim()) {
      setError('O título da aula é obrigatório.');
      setLoading(false);
      return;
    }
     if (!formattedNumber) {
      setError('O número da aula é obrigatório (ex: 01, 02).');
      setLoading(false);
      return;
    }

    try {
      // Admin role allows insert via RLS policy
      const { error: insertError } = await supabase
        .from('lessons')
        .insert([{
            discipline_id: disciplineId,
            title: title.trim(),
            number: formattedNumber,
            content: content.trim() || null,
            video_url: finalVideoUrl,
            order: finalOrder
        }]);

      if (insertError) throw insertError;

      setSuccess(`Aula "${title.trim()}" (${formattedNumber}) adicionada com sucesso!`);
      // Clear form
      setTitle('');
      setNumber('');
      setContent('');
      setVideoUrl('');
      setOrder('');
      onLessonAdded(); // Trigger refresh in parent
    } catch (err: any) {
      console.error("Error adding lesson:", err);
      setError(err.message || 'Falha ao adicionar aula.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.formContainer}> {/* Apply container style */}
      <h4>Adicionar Nova Aula</h4>
      <form onSubmit={handleSubmit}>
         {/* Row 1: Number and Title */}
         <div className={styles.formRow}> {/* Apply row style */}
            <label htmlFor="lessonNumber" style={{ marginRight: '5px' }}>Número:</label>
            <input
                type="text"
                id="lessonNumber"
                value={number}
                onChange={handleNumberChange}
                onBlur={handleNumberBlur}
                required
                disabled={loading}
                placeholder="Ex: 01"
                pattern="\d+"
                title="Digite o número da aula (ex: 1, 2, 10)"
                style={{ width: '50px', marginRight: '15px' }}
            />
            <label htmlFor="lessonTitle" style={{ marginRight: '5px' }}>Título:</label>
            <input
                type="text"
                id="lessonTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={loading}
                placeholder="Ex: Variáveis"
                style={{ width: '300px', marginRight: '15px' }}
            />
             <label htmlFor="lessonOrder" style={{ marginRight: '5px' }}>Ordem (Opcional):</label>
             <input
                type="number"
                id="lessonOrder"
                value={order}
                onChange={handleOrderChange}
                disabled={loading}
                placeholder="Ex: 1"
                min="1"
                style={{ width: '60px' }}
            />
        </div>

        {/* Row 2: Content */}
         <div className={styles.formGroup}> {/* Apply group style */}
          <label htmlFor="lessonContent">Conteúdo:</label><br />
          <textarea
            id="lessonContent"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={loading}
            rows={5}
            placeholder="Digite o conteúdo principal da aula aqui..."
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>

         {/* Row 3: Video URL */}
         <div className={styles.formGroup}> {/* Apply group style */}
          <label htmlFor="lessonVideoUrl">URL do Vídeo (Opcional):</label><br />
          <input
            type="url"
            id="lessonVideoUrl"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            disabled={loading}
            placeholder="https://..."
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        <button type="submit" disabled={loading} className={styles.submitButton}> {/* Apply button style */}
          {loading ? 'Adicionando...' : 'Adicionar Aula'}
        </button>
        {error && <p className={styles.errorMessage}>Erro: {error}</p>} {/* Apply error style */}
        {success && <p className={styles.successMessage}>{success}</p>} {/* Apply success style */}
      </form>
    </div>
  );
};

export default AddLessonForm;