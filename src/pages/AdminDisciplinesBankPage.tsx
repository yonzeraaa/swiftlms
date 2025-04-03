import React, { useRef } from 'react';
import AddDisciplineForm from '../components/AddDisciplineForm';
import DisciplineBankList, { DisciplineBankListHandle } from '../components/DisciplineBankList';
import styles from './AdminDisciplinesBankPage.module.css';

const AdminDisciplinesBankPage: React.FC = () => {
  const disciplineBankListRef = useRef<DisciplineBankListHandle>(null);

  // TODO: Implement handleDisciplineAdded/Updated/Deleted callbacks
  // Callback to refresh the list after an action (create, update, delete)
  const handleDisciplineAction = () => {
    disciplineBankListRef.current?.refreshDisciplines();
  };

  return (
    <div className={styles.pageContainer}>
      <h1>Disciplinas</h1> {/* Renamed */}
      <p>Crie, edite e gerencie todas as disciplinas da plataforma.</p> {/* Adjusted text */}
      <hr />
      {/* TODO: Render modified AddDisciplineForm */}
      {/* Pass the renamed callback prop */}
      <AddDisciplineForm onDisciplineCreated={handleDisciplineAction} />
      <hr />
      {/* TODO: Render DisciplineBankList */}
      {/* Pass the ref to the list component */}
      <DisciplineBankList ref={disciplineBankListRef} />
    </div>
  );
};

export default AdminDisciplinesBankPage;