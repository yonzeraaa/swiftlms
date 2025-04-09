import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'; // Removed React import
import styles from './TestList.module.css'; // Create this CSS module later
// TODO: Import Supabase client

// Define the shape of a test object (adjust based on actual data needed)
interface Test {
    id: string;
    name: string;
    discipline_id: string; // Keep ID for now, fetch name separately if needed
    num_questions: number;
    // Add other relevant fields if needed for display
}

// Define the props for the component
interface TestListProps {
    // No props needed initially if fetching data internally
    // Alternatively, pass tests as a prop: tests: Test[];
    onEditTest: (testId: string) => void;
    onDeleteTest: (testId: string) => void;
}

// Define the type for the handle that will be exposed via the ref
export interface TestListHandle {
    refreshTests: () => void;
}

const TestList = forwardRef<TestListHandle, TestListProps>(({ onEditTest, onDeleteTest }, ref) => {
    const [tests, setTests] = useState<Test[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTests = async () => {
        setIsLoading(true);
        setError(null);
        console.log("[TestList] Fetching tests...");
        try {
            // --- TODO: Replace with actual Supabase fetch logic ---
            // const { data, error } = await supabase
            //     .from('tests')
            //     .select('id, name, discipline_id, num_questions') // Select necessary fields
            //     .order('name', { ascending: true });
            // if (error) throw error;
            // setTests(data || []);
            // --- End Supabase Logic ---

            // Placeholder data:
            await new Promise(resolve => setTimeout(resolve, 700)); // Simulate fetch
             const placeholderTests = [
                { id: '1', name: 'Teste de Estabilidade 1', discipline_id: 'abc', num_questions: 10 },
                { id: '2', name: 'Teste de Carga 1', discipline_id: 'def', num_questions: 5 },
                { id: '3', name: 'Avaliação Final Mecânica', discipline_id: 'xyz', num_questions: 20 },
            ];
            setTests(placeholderTests);


        } catch (err: any) {
            console.error("[TestList] Error fetching tests:", err);
            setError(`Erro ao carregar testes: ${err.message}`);
            setTests([]); // Clear tests on error
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch tests on component mount
    useEffect(() => {
        fetchTests();
    }, []);

    // Expose the refresh function via the ref
    useImperativeHandle(ref, () => ({
        refreshTests() {
            fetchTests();
        }
    }));

    return (
        <div className={styles.listContainer}> {/* Apply container style */}
            {error && <div className="mb-4 text-red-600 bg-red-100 p-3 rounded">{error}</div>}
            {isLoading && <div className="text-center py-4">Carregando testes...</div>}

            {!isLoading && !error && (
                <div className="bg-white shadow-md rounded my-6">
                    <table className="min-w-full table-auto">
                        <thead>
                            <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                                <th className="py-3 px-6 text-left">Nome do Teste</th>
                                <th className="py-3 px-6 text-left">Disciplina ID</th> {/* TODO: Display Name */}
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
                                        {test.discipline_id} {/* TODO: Fetch and display discipline name */}
                                    </td>
                                    <td className="py-3 px-6 text-center">
                                        {test.num_questions}
                                    </td>
                                    <td className="py-3 px-6 text-center">
                                        <div className="flex item-center justify-center">
                                            <button
                                                onClick={() => onEditTest(test.id)}
                                                className="w-4 mr-2 transform hover:text-purple-500 hover:scale-110"
                                                title="Editar"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => onDeleteTest(test.id)}
                                                className="w-4 mr-2 transform hover:text-red-500 hover:scale-110"
                                                title="Excluir"
                                            >
                                                🗑️
                                            </button>
                                            {/* Add other actions if needed, e.g., view results */}
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
            )}
        </div>
    );
});

// Set display name for React DevTools
TestList.displayName = 'TestList';

export default TestList;