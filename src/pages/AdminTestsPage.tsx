import React, { useState, useRef } from 'react'; // Removed useEffect
import AddTestForm from '../components/AddTestForm'; // Import the form component
import styles from './AdminTestsPage.module.css'; // Import the CSS module
import TestList, { TestListHandle } from '../components/TestList'; // Import TestList and its handle type
// TODO: Import Supabase client for fetching tests

// TODO: Implementar a lógica de busca e exibição de testes

const AdminTestsPage: React.FC = () => {
  const [isAddFormVisible, setIsAddFormVisible] = useState(false);
  // Removed isLoading and error state, as TestList will handle its own loading/error
  const testListRef = useRef<TestListHandle>(null); // Ref for TestList
  // Removed error state as it's not used at the page level currently

  // Removed placeholder tests array and fetchTests logic from this page


  const handleAddTest = () => {
    setIsAddFormVisible(true); // Show the form
  };

  const handleEditTest = (testId: string) => {
    // TODO: Implement edit functionality (likely open a similar form pre-filled)
    console.log(`Edit Test button clicked for ${testId}`);
  };

  const handleDeleteTest = async (testId: string) => {
    // TODO: Implement delete functionality with confirmation
    // try {
    //  if (window.confirm('Tem certeza que deseja excluir este teste?')) {
    //      // await supabase.from('tests').delete().match({ id: testId });
    //      fetchTests(); // Refresh list
    //  }
    // } catch (err: any) {
    //    console.error("Error deleting test:", err);
    //    setError(`Erro ao excluir teste: ${err.message}`);
    // }
    console.log(`Delete Test button clicked for ${testId}`);
  };

  const handleCloseAddForm = () => {
    setIsAddFormVisible(false);
  };

  const handleTestAdded = () => {
    testListRef.current?.refreshTests(); // Refresh the list via ref
  };


  return (
    <div className={styles.pageContainer}> {/* Apply container style */}
      <h1>Gerenciar Testes</h1>
      <p>Adicione, edite e gerencie os testes de múltipla escolha.</p>
      <hr />

      {/* Error display removed */}

      {/* Button to open the Add Test form */}
      <div className="mb-6">
        {/* TODO: Adicionar filtro por disciplina */}
        <button
          onClick={handleAddTest}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Adicionar Novo Teste
        </button>
      </div>

      {/* Use the TestList component */}
      <TestList
        ref={testListRef}
        onEditTest={handleEditTest}
        onDeleteTest={handleDeleteTest}
      />

      {/* Render AddTestForm conditionally */}
      {isAddFormVisible && (
        <AddTestForm
          onClose={handleCloseAddForm}
          onTestAdded={handleTestAdded}
        />
      )}

    </div>
  );
};

export default AdminTestsPage;