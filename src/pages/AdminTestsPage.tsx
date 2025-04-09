import React, { useState, useRef } from 'react'; // Removed useEffect
import AddTestForm from '../components/AddTestForm'; // Import the form component
import styles from './AdminTestsPage.module.css'; // Import the CSS module
import TestList, { TestListHandle } from '../components/TestList'; // Import TestList and its handle type
import { supabase } from '../services/supabaseClient'; // Import Supabase client
import EditTestForm from '../components/EditTestForm'; // Import EditTestForm

// TODO: Implementar a lógica de busca e exibição de testes

const AdminTestsPage: React.FC = () => {
  const [isAddFormVisible, setIsAddFormVisible] = useState(false);
  const [isEditFormVisible, setIsEditFormVisible] = useState(false); // State for edit form visibility
  const [editingTest, setEditingTest] = useState<any | null>(null); // State to hold the test being edited (use a proper type later)
  const testListRef = useRef<TestListHandle>(null); // Ref for TestList
  // Removed error state as it's not used at the page level currently

  // Removed placeholder tests array and fetchTests logic from this page


  const handleAddTest = () => {
    setIsAddFormVisible(true); // Show the form
  };

  const handleEditTest = async (testId: string) => {
    console.log(`[AdminTestsPage] Edit requested for test: ${testId}`);
    // Fetch the full test details to pre-fill the form
    try {
      const { data, error } = await supabase
        .from('tests')
        .select('*') // Select all fields for editing
        .eq('id', testId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Teste não encontrado.');

      setEditingTest(data); // Set the test data
      setIsEditFormVisible(true); // Show the edit form

    } catch (err: any) {
      console.error("[AdminTestsPage] Error fetching test for edit:", err);
      alert(`Erro ao carregar dados do teste para edição: ${err.message}`);
    }
  };

  const handleDeleteTest = async (testId: string) => {
    // 1. Confirm deletion
    if (!window.confirm('Tem certeza que deseja excluir este teste? Esta ação não pode ser desfeita.')) {
      return; // Abort if user cancels
    }

    console.log(`[AdminTestsPage] Attempting to delete test: ${testId}`);
    // setError(null); // Clear previous errors if error state is re-added

    try {
      // 2. Call Supabase to delete
      const { error: deleteError } = await supabase
        .from('tests')
        .delete()
        .match({ id: testId });

      if (deleteError) {
        throw deleteError;
      }

      console.log(`[AdminTestsPage] Test ${testId} deleted successfully.`);
      // 3. Refresh the list
      testListRef.current?.refreshTests();

      // TODO: Consider deleting the associated PDF from storage as well
      // This requires knowing the pdf_storage_path, which might need fetching first
      // or passed from TestList if available.
      // Example:
      // const { error: storageError } = await supabase.storage.from('swiftlms-pdfs').remove([pdfPathToDelete]);
      // if (storageError) console.error("Error deleting PDF from storage:", storageError);


    } catch (err: any) {
      console.error("[AdminTestsPage] Error deleting test:", err);
      // setError(`Erro ao excluir teste: ${err.message}`); // Set error state if re-added
      alert(`Erro ao excluir teste: ${err.message}`); // Simple alert for now
    }
  };

  const handleCloseAddForm = () => {
    setIsAddFormVisible(false);
  };

  const handleTestAdded = () => {
    testListRef.current?.refreshTests(); // Refresh the list via ref
  };

  const handleCloseEditForm = () => {
    setIsEditFormVisible(false);
    setEditingTest(null);
  };

  const handleTestUpdated = () => {
    testListRef.current?.refreshTests(); // Refresh list after update
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

      {/* Render AddTestForm */}
      {isAddFormVisible && (
        <AddTestForm
          onClose={handleCloseAddForm}
          onTestAdded={handleTestAdded}
        />
      )}

      {/* Render EditTestForm */}
      {isEditFormVisible && editingTest && (
        <EditTestForm
          test={editingTest}
          onClose={handleCloseEditForm}
          onTestUpdated={handleTestUpdated}
        />
        // Removed placeholder
      )}

    </div>
  );
};

export default AdminTestsPage;