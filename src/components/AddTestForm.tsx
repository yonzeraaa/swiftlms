import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient'; // Import Supabase client

interface Discipline {
  id: string;
  title: string;
}

interface AddTestFormProps {
  onClose: () => void; // Function to close the form/modal
  onTestAdded: () => void; // Function to refresh the test list after adding
}

const AddTestForm: React.FC<AddTestFormProps> = ({ onClose, onTestAdded }) => {
  const [testName, setTestName] = useState('');
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('');
  const [numQuestions, setNumQuestions] = useState<number>(1); // Default to 1 question
  const [minPassingGrade, setMinPassingGrade] = useState<number>(70); // Default to 70%
  const [maxAttempts, setMaxAttempts] = useState<number>(3); // Default to 3 attempts
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [correctAnswers, setCorrectAnswers] = useState<{ [key: number]: string }>({});
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDisciplines = async () => {
      console.log('[AddTestForm] Fetching disciplines...');
      setError(null); // Clear previous errors
      try {
        const { data, error } = await supabase
          .from('disciplines')
          .select('id, title') // Select only needed fields
          .order('title', { ascending: true }); // Order alphabetically

        if (error) throw error;

        setDisciplines(data || []);
        console.log('[AddTestForm] Disciplines fetched:', data);
      } catch (err: any) {
        console.error('[AddTestForm] Error fetching disciplines:', err);
        setError(`Erro ao carregar disciplinas: ${err.message}`);
        setDisciplines([]); // Clear disciplines on error
      }
    }; // End of fetchDisciplines function

    fetchDisciplines(); // Call fetchDisciplines inside the useEffect callback

  }, []); // Empty dependency array ensures it runs once on mount

  const handleAnswerChange = (questionNumber: number, answer: string) => {
    setCorrectAnswers(prev => ({ ...prev, [questionNumber]: answer.toUpperCase() }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setPdfFile(event.target.files[0]);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!pdfFile || !selectedDiscipline || numQuestions <= 0) {
      setError('Por favor, preencha todos os campos obrigatórios e selecione um arquivo PDF.');
      setIsLoading(false);
      return;
    }

    // Validate correct answers count matches numQuestions
    if (Object.keys(correctAnswers).length !== numQuestions) {
        setError(`O número de respostas no gabarito (${Object.keys(correctAnswers).length}) não corresponde ao número de questões (${numQuestions}).`);
        setIsLoading(false);
        return;
    }

    console.log('Submitting test data:', {
        testName,
        selectedDiscipline,
        numQuestions,
        minPassingGrade,
        maxAttempts,
        pdfFileName: pdfFile.name,
        correctAnswers,
    });

    // --- TODO: Implement Supabase Logic ---
    // 1. Upload PDF to Supabase Storage
    //    - Generate a unique path (e.g., `tests/${selectedDiscipline}/${pdfFile.name}`)
    //    - Get the storage path after upload.
    // 2. Insert test data into the 'tests' table
    //    - Include the pdf_storage_path obtained from step 1.
    //    - Store correctAnswers as JSONB.
    // --- End Supabase Logic ---

    // Placeholder for success simulation
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay

    // Assuming success:
    console.log('Test added successfully (simulated)');
    setIsLoading(false);
    onTestAdded(); // Callback to refresh list
    onClose(); // Close the form/modal

    // Handle potential errors during upload/insert
    // setError('Ocorreu um erro ao adicionar o teste.');
    // setIsLoading(false);
  };

  // Generate inputs for correct answers based on numQuestions
  const answerInputs = Array.from({ length: numQuestions }, (_, i) => i + 1).map((qNum) => (
    <div key={qNum} className="mb-2 flex items-center">
      <label htmlFor={`q${qNum}`} className="block text-sm font-medium text-gray-700 w-16 mr-2">
        Q{qNum}:
      </label>
      <input
        type="text"
        id={`q${qNum}`}
        maxLength={1} // Assuming single character answers (A, B, C, D, E...)
        value={correctAnswers[qNum] || ''}
        onChange={(e) => handleAnswerChange(qNum, e.target.value)}
        className="mt-1 block w-20 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm uppercase"
        required
      />
    </div>
  ));


  return (
    // Basic form structure - styling can be improved (e.g., using a modal component)
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center">
       <div className="relative bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
            <h2 className="text-xl font-semibold mb-4">Adicionar Novo Teste</h2>
            {error && <div className="mb-4 text-red-600 bg-red-100 p-3 rounded">{error}</div>}
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label htmlFor="testName" className="block text-sm font-medium text-gray-700">Nome do Teste</label>
                    <input
                        type="text"
                        id="testName"
                        value={testName}
                        onChange={(e) => setTestName(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        required
                    />
                </div>

                <div className="mb-4">
                    <label htmlFor="discipline" className="block text-sm font-medium text-gray-700">Disciplina</label>
                    <select
                        id="discipline"
                        value={selectedDiscipline}
                        onChange={(e) => setSelectedDiscipline(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        required
                    >
                        <option value="">Selecione uma disciplina</option>
                        {disciplines.map(d => (
                            <option key={d.id} value={d.id}>{d.title}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label htmlFor="numQuestions" className="block text-sm font-medium text-gray-700">Nº de Questões</label>
                        <input
                            type="number"
                            id="numQuestions"
                            min="1"
                            max="50" // As per requirement
                            value={numQuestions}
                            onChange={(e) => setNumQuestions(Math.max(1, parseInt(e.target.value, 10) || 1))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            required
                        />
                    </div>
                     <div>
                        <label htmlFor="minPassingGrade" className="block text-sm font-medium text-gray-700">Nota Mínima (%)</label>
                        <input
                            type="number"
                            id="minPassingGrade"
                            min="0"
                            max="100"
                            value={minPassingGrade}
                            onChange={(e) => setMinPassingGrade(parseInt(e.target.value, 10) || 0)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            required
                        />
                    </div>
                     <div>
                        <label htmlFor="maxAttempts" className="block text-sm font-medium text-gray-700">Tentativas Máx.</label>
                        <input
                            type="number"
                            id="maxAttempts"
                            min="1"
                            value={maxAttempts}
                            onChange={(e) => setMaxAttempts(Math.max(1, parseInt(e.target.value, 10) || 1))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            required
                        />
                    </div>
                </div>


                <div className="mb-4">
                    <label htmlFor="pdfFile" className="block text-sm font-medium text-gray-700">Arquivo PDF do Teste</label>
                    <input
                        type="file"
                        id="pdfFile"
                        accept="application/pdf"
                        onChange={handleFileChange}
                        className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        required
                    />
                     {pdfFile && <p className="text-xs text-gray-500 mt-1">Selecionado: {pdfFile.name}</p>}
                </div>

                <div className="mb-4 border-t pt-4">
                     <h3 className="text-lg font-medium mb-2">Gabarito</h3>
                     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-2">
                        {answerInputs}
                     </div>
                </div>


                <div className="flex justify-end gap-4 mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        disabled={isLoading}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Salvando...' : 'Salvar Teste'}
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
};

export default AddTestForm;