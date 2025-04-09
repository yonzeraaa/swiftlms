import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

// Define the shape of the test data prop
interface TestData {
    id: string;
    name: string;
    discipline_id: string;
    num_questions: number;
    min_passing_grade: number;
    max_attempts: number;
    correct_answers: { [key: number]: string };
    pdf_storage_path: string | null; // Existing path
    // Add other fields if necessary
}

interface Discipline {
  id: string;
  title: string;
}

interface EditTestFormProps {
  test: TestData; // The test data to edit
  onClose: () => void;
  onTestUpdated: () => void;
}

const EditTestForm: React.FC<EditTestFormProps> = ({ test, onClose, onTestUpdated }) => {
  // Initialize state with existing test data
  const [testName, setTestName] = useState(test.name);
  const [selectedDiscipline, setSelectedDiscipline] = useState(test.discipline_id);
  const [numQuestions, setNumQuestions] = useState(test.num_questions);
  const [minPassingGrade, setMinPassingGrade] = useState(test.min_passing_grade);
  const [maxAttempts, setMaxAttempts] = useState(test.max_attempts);
  const [pdfFile, setPdfFile] = useState<File | null>(null); // For optional new PDF upload
  const [correctAnswers, setCorrectAnswers] = useState<{ [key: number]: string }>(test.correct_answers || {});
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch disciplines (same as AddTestForm)
  useEffect(() => {
    const fetchDisciplines = async () => {
      console.log('[EditTestForm] Fetching disciplines...');
      setError(null);
      try {
        const { data, error } = await supabase
          .from('disciplines')
          .select('id, title')
          .order('title', { ascending: true });
        if (error) throw error;
        setDisciplines(data || []);
      } catch (err: any) {
        console.error('[EditTestForm] Error fetching disciplines:', err);
        setError(`Erro ao carregar disciplinas: ${err.message}`);
      }
    };
    fetchDisciplines();
  }, []);

  // Handle answer change (same as AddTestForm)
  const handleAnswerChange = (questionNumber: number, answer: string) => {
    setCorrectAnswers(prev => ({ ...prev, [questionNumber]: answer.toUpperCase() }));
  };

  // Handle file change (same as AddTestForm)
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setPdfFile(event.target.files[0]);
    } else {
      setPdfFile(null); // Clear if no file selected
    }
  };

  // Handle form submission for UPDATE
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    // Basic validation
    if (!selectedDiscipline || numQuestions <= 0) {
      setError('Disciplina e número de questões são obrigatórios.');
      setIsLoading(false);
      return;
    }
    if (Object.keys(correctAnswers).length !== numQuestions) {
        setError(`O número de respostas no gabarito (${Object.keys(correctAnswers).length}) não corresponde ao número de questões (${numQuestions}).`);
        setIsLoading(false);
        return;
    }

    let pdfStoragePath = test.pdf_storage_path; // Keep existing path by default

    try {
        // 1. Upload NEW PDF if selected
        if (pdfFile) {
            const fileExt = pdfFile.name.split('.').pop();
            const uniqueFileName = `${Date.now()}.${fileExt}`;
            const newFilePath = `public/tests/${selectedDiscipline}/${uniqueFileName}`;

            console.log(`[EditTestForm] Uploading NEW PDF to: ${newFilePath}`);
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('swiftlms-pdfs') // Use the correct bucket name
                .upload(newFilePath, pdfFile);

            if (uploadError) throw new Error(`Erro no upload do novo PDF: ${uploadError.message}`);

            pdfStoragePath = uploadData.path; // Update path to the new file
            console.log('[EditTestForm] New PDF Upload Success:', uploadData);

            // TODO: Optionally delete the OLD PDF file from storage if pdfStoragePath was not null before
            // if (test.pdf_storage_path) {
            //    await supabase.storage.from('swiftlms-pdfs').remove([test.pdf_storage_path]);
            // }
        }

        // 2. Prepare data for update
        const testDataToUpdate = {
            discipline_id: selectedDiscipline,
            name: testName,
            pdf_storage_path: pdfStoragePath, // Use new or existing path
            num_questions: numQuestions,
            min_passing_grade: minPassingGrade,
            max_attempts: maxAttempts,
            correct_answers: correctAnswers,
            updated_at: new Date().toISOString(), // Manually update timestamp
        };

        console.log('[EditTestForm] Updating test data for ID:', test.id, testDataToUpdate);

        // 3. Update test data in the 'tests' table
        const { error: updateError } = await supabase
            .from('tests')
            .update(testDataToUpdate)
            .match({ id: test.id }); // Match the specific test ID

        if (updateError) throw new Error(`Erro ao atualizar o teste: ${updateError.message}`);

        console.log('[EditTestForm] Test updated successfully.');
        setIsLoading(false);
        onTestUpdated(); // Callback to refresh list
        onClose(); // Close the form

    } catch (err: any) {
        console.error('[EditTestForm] Error in handleSubmit:', err);
        setError(err.message || 'Ocorreu um erro inesperado ao atualizar.');
        setIsLoading(false);
    }
  };

  // Generate answer inputs (same as AddTestForm)
  const answerInputs = Array.from({ length: numQuestions }, (_, i) => i + 1).map((qNum) => (
    <div key={qNum} className="mb-2 flex items-center">
      <label htmlFor={`edit-q${qNum}`} className="block text-sm font-medium text-gray-700 w-16 mr-2">
        Q{qNum}:
      </label>
      <input
        type="text"
        id={`edit-q${qNum}`}
        maxLength={1}
        value={correctAnswers[qNum] || ''}
        onChange={(e) => handleAnswerChange(qNum, e.target.value)}
        className="mt-1 block w-20 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm uppercase"
        required
      />
    </div>
  ));

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center">
       <div className="relative bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
            <h2 className="text-xl font-semibold mb-4">Editar Teste</h2>
            {error && <div className="mb-4 text-red-600 bg-red-100 p-3 rounded">{error}</div>}
            <form onSubmit={handleSubmit}>
                {/* Form fields are the same as AddTestForm, but pre-filled */}
                <div className="mb-4">
                    <label htmlFor="editTestName" className="block text-sm font-medium text-gray-700">Nome do Teste</label>
                    <input
                        type="text"
                        id="editTestName"
                        value={testName}
                        onChange={(e) => setTestName(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        required
                    />
                </div>

                <div className="mb-4">
                    <label htmlFor="editDiscipline" className="block text-sm font-medium text-gray-700">Disciplina</label>
                    <select
                        id="editDiscipline"
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
                        <label htmlFor="editNumQuestions" className="block text-sm font-medium text-gray-700">Nº de Questões</label>
                        <input
                            type="number"
                            id="editNumQuestions"
                            min="1"
                            max="50"
                            value={numQuestions}
                            onChange={(e) => setNumQuestions(Math.max(1, parseInt(e.target.value, 10) || 1))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            required
                        />
                    </div>
                     <div>
                        <label htmlFor="editMinPassingGrade" className="block text-sm font-medium text-gray-700">Nota Mínima (%)</label>
                        <input
                            type="number"
                            id="editMinPassingGrade"
                            min="0"
                            max="100"
                            value={minPassingGrade}
                            onChange={(e) => setMinPassingGrade(parseInt(e.target.value, 10) || 0)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            required
                        />
                    </div>
                     <div>
                        <label htmlFor="editMaxAttempts" className="block text-sm font-medium text-gray-700">Tentativas Máx.</label>
                        <input
                            type="number"
                            id="editMaxAttempts"
                            min="1"
                            value={maxAttempts}
                            onChange={(e) => setMaxAttempts(Math.max(1, parseInt(e.target.value, 10) || 1))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            required
                        />
                    </div>
                </div>

                <div className="mb-4">
                    <label htmlFor="editPdfFile" className="block text-sm font-medium text-gray-700">Substituir PDF (Opcional)</label>
                    <input
                        type="file"
                        id="editPdfFile"
                        accept="application/pdf"
                        onChange={handleFileChange}
                        className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                     {pdfFile && <p className="text-xs text-gray-500 mt-1">Novo PDF selecionado: {pdfFile.name}</p>}
                     {!pdfFile && test.pdf_storage_path && <p className="text-xs text-gray-500 mt-1">PDF atual: {test.pdf_storage_path.split('/').pop()}</p>}
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
                        className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Atualizando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
};

export default EditTestForm;