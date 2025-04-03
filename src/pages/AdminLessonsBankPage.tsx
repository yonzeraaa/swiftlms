import React, { useRef } from 'react';
import AddLessonBankForm from '../components/AddLessonBankForm'; // Será criado
import LessonBankList, { LessonBankListHandle } from '../components/LessonBankList'; // Será criado
import styles from './AdminLessonsBankPage.module.css'; // Será criado

const AdminLessonsBankPage: React.FC = () => {
  const lessonBankListRef = useRef<LessonBankListHandle>(null);

  // Callback para atualizar a lista após uma ação (criar, editar, excluir)
  const handleLessonAction = () => {
    lessonBankListRef.current?.refreshLessons();
  };

  return (
    <div className={styles.pageContainer}>
      <h1>Aulas</h1> {/* Renamed */}
      <p>Crie, edite e gerencie todas as aulas da plataforma.</p> {/* Adjusted text */}
      <hr />
      {/* Formulário para adicionar aulas ao banco */}
      <AddLessonBankForm onLessonCreated={handleLessonAction} />
      <hr />
      {/* Lista de aulas do banco */}
      <LessonBankList ref={lessonBankListRef} />
    </div>
  );
};

export default AdminLessonsBankPage;