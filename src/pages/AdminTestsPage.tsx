import React, { useState, useEffect } from 'react';
import AddTestForm from '../components/AddTestForm'; // Import the form component
// TODO: Import Supabase client for fetching tests

// TODO: Implementar a lógica de busca e exibição de testes

const AdminTestsPage: React.FC = () => {
  const [isAddFormVisible, setIsAddFormVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // For loading tests
  const [error, setError] = useState<string | null>(null); // For displaying errors

  // TODO: Replace placeholder data with actual state fetched from Supabase
  const tests = [
    { id: '1', name: 'Teste de Estabilidade 1', disciplineId: 'abc', numQuestions: 10 },
    { id: '2', name: 'Teste de Carga 1', disciplineId: 'def', numQuestions: 5 },
  ]; // Placeholder

  // TODO: Implement fetchTests function using Supabase client
  const fetchTests = async () => {
      setIsLoading(true);
      setError(null);
      console.log("Fetching tests from Supabase...");
      // try {
      //   const { data, error } = await supabase.from('tests').select('*'); // Adjust query as needed
      //   if (error) throw error;
      //   // setTests(data); // Update state with fetched data
      // } catch (err: any) {
      //   setError(`Erro ao buscar testes: ${err.message}`);
      //   console.error("Error fetching tests:", err);
      // } finally {
      //   setIsLoading(false);
      // }
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate fetch
      setIsLoading(false); // Remove this line when implementing real fetch
  };

  // Fetch tests on component mount
  useEffect(() => {
    fetchTests();
  }, []);


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
    fetchTests(); // Refresh the list after a test is added
  };


  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Gerenciar Testes</h1>

      {error && <div className="mb-4 text-red-600 bg-red-100 p-3 rounded">{error}</div>}

      <div className="mb-4">
        {/* TODO: Adicionar filtro por disciplina */}
        <button
          onClick={handleAddTest}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Adicionar Novo Teste
        </button>
      </div>

      {isLoading && <div className="text-center py-4">Carregando testes...</div>}

      {/* TODO: Criar um componente TestList para exibir os testes */}
      <div className="bg-white shadow-md rounded my-6">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
              <th className="py-3 px-6 text-left">Nome do Teste</th>
              <th className="py-3 px-6 text-left">Disciplina ID</th>
              <th className="py-3 px-6 text-center">Nº Questões</th>
              <th className="py-3 px-6 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm font-light">
            {tests.map((test) => (
              <tr key={test.id} className="border-b border-gray-200 hover:bg-gray-100">
                <td className="py-3 px-6 text-left whitespace-nowrap">
                  {test.name}
                </td>
                <td className="py-3 px-6 text-left">
                  {test.disciplineId}
                </td>
                 <td className="py-3 px-6 text-center">
                  {test.numQuestions}
                </td>
                <td className="py-3 px-6 text-center">
                  <div className="flex item-center justify-center">
                    <button
                      onClick={() => handleEditTest(test.id)}
                      className="w-4 mr-2 transform hover:text-purple-500 hover:scale-110"
                      title="Editar"
                    >
                      {/* Placeholder for Edit Icon */}
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteTest(test.id)}
                      className="w-4 mr-2 transform hover:text-red-500 hover:scale-110"
                      title="Excluir"
                    >
                       {/* Placeholder for Delete Icon */}
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
             {tests.length === 0 && (
                <tr>
                    <td colSpan={4} className="text-center py-4">Nenhum teste encontrado.</td>
                </tr>
             )}
          </tbody>
        </table>
      </div>

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