import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import styles from './AddLessonBankForm.module.css'; // Será criado

interface AddLessonBankFormProps {
  onLessonCreated: () => void; // Callback para atualizar a lista
}

const AddLessonBankForm: React.FC<AddLessonBankFormProps> = ({ onLessonCreated }) => {
  const [title, setTitle] = useState('');
  // const [number, setNumber] = useState(''); // Removed number state
  const [content, setContent] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [order, setOrder] = useState<number | ''>(''); // Optional explicit order
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Removed number formatting and handling functions
  // const formatNumber = ...
  // const handleNumberChange = ...
  // const handleNumberBlur = ...

   const handleOrderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setOrder(val === '' ? '' : parseInt(val, 10));
  };


  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // const formattedNumber = formatNumber(number); // Removed number formatting
    const finalOrder = order === '' ? null : order;
    const finalVideoUrl = videoUrl.trim() || null;
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError('O título da aula é obrigatório.');
      setLoading(false);
      return;
    }
    // Removed validation for number
    //  if (!formattedNumber) { ... }

    try {
      // Admin role allows insert via RLS policy
      const { error: insertError } = await supabase
        .from('lessons')
        .insert([{
            // discipline_id is removed
            title: trimmedTitle,
            number: null, // Set number to null explicitly or remove if DB default is null
            content: content.trim() || null,
            video_url: finalVideoUrl,
            order: finalOrder
        }]);

      if (insertError) throw insertError;

      setSuccess(`Aula "${trimmedTitle}" adicionada ao banco com sucesso!`); // Removed number from success message
      // Clear form
      setTitle('');
      // setNumber(''); // Removed number clearing
      setContent('');
      setVideoUrl('');
      setOrder('');
      onLessonCreated(); // Trigger refresh in parent
    } catch (err: any) {
      console.error("Error adding lesson to bank:", err);
      setError(err.message || 'Falha ao adicionar aula ao banco.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.formContainer}> {/* Apply container style */}
      <h3>Adicionar Nova Aula ao Banco</h3>
      <form onSubmit={handleSubmit}>
         {/* Row 1: Number and Title */}
         <div className={styles.formRow}> {/* Apply row style */}
            {/* Removed Number Input */}
            <label htmlFor="lessonBankTitle" style={{ marginRight: '5px' }}>Título:</label>
            <input
                type="text"
                id="lessonBankTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={loading}
                placeholder="Ex: Variáveis"
                style={{ flexGrow: 1, marginRight: '15px' }} /* Allow title to grow */
            />
             <label htmlFor="lessonBankOrder" style={{ marginRight: '5px' }}>Ordem (Opcional):</label>
             <input
                type="number"
                id="lessonBankOrder"
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
          <label htmlFor="lessonBankContent">Conteúdo:</label><br />
          <textarea
            id="lessonBankContent"
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
          <label htmlFor="lessonBankVideoUrl">URL do Vídeo/PDF (Opcional):</label><br />
          <input
            type="url"
            id="lessonBankVideoUrl"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            disabled={loading}
            placeholder="https://... (YouTube, Vimeo, MP4, PDF, Google Drive)"
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        <button type="submit" disabled={loading} className={styles.submitButton}> {/* Apply button style */}
          {loading ? 'Adicionando...' : 'Adicionar Aula ao Banco'}
        </button>
        {error && <p className={styles.errorMessage}>Erro: {error}</p>} {/* Apply error style */}
        {success && <p className={styles.successMessage}>{success}</p>} {/* Apply success style */}
      </form>
    </div>
  );
};

export default AddLessonBankForm;