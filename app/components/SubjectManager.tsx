'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/lib/database.types';
import { Plus, X, Loader2 } from 'lucide-react';

type Subject = Tables<'subjects'>;
type CourseSubject = Tables<'course_subjects'>;

interface SubjectManagerProps {
  courseId: string;
  courseName: string;
}

export default function SubjectManager({ courseId, courseName }: SubjectManagerProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [courseSubjects, setCourseSubjects] = useState<CourseSubject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [semester, setSemester] = useState(1);
  const [credits, setCredits] = useState(4);
  const [isRequired, setIsRequired] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, [courseId]);

  async function loadData() {
    try {
      setLoading(true);

      // Carregar todas as matérias
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .order('name');

      if (subjectsError) throw subjectsError;

      // Carregar matérias do curso
      const { data: courseSubjectsData, error: courseSubjectsError } = await supabase
        .from('course_subjects')
        .select('*, subjects(*)')
        .eq('course_id', courseId)
        .order('semester, is_required');

      if (courseSubjectsError) throw courseSubjectsError;

      setSubjects(subjectsData || []);
      setCourseSubjects(courseSubjectsData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddSubject() {
    if (!selectedSubjectId) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('course_subjects')
        .insert({
          course_id: courseId,
          subject_id: selectedSubjectId,
          semester,
          credits,
          is_required: isRequired
        });

      if (error) throw error;

      // Recarregar dados
      await loadData();

      // Limpar formulário
      setSelectedSubjectId('');
      setSemester(1);
      setCredits(4);
      setIsRequired(true);
    } catch (error) {
      console.error('Erro ao adicionar matéria:', error);
      alert('Erro ao adicionar matéria ao curso');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveSubject(courseSubjectId: string) {
    if (!confirm('Tem certeza que deseja remover esta matéria do curso?')) return;

    try {
      const { error } = await supabase
        .from('course_subjects')
        .delete()
        .eq('id', courseSubjectId);

      if (error) throw error;

      // Recarregar dados
      await loadData();
    } catch (error) {
      console.error('Erro ao remover matéria:', error);
      alert('Erro ao remover matéria do curso');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  // Filtrar matérias que ainda não foram adicionadas ao curso
  const availableSubjects = subjects.filter(
    subject => !courseSubjects.some(cs => cs.subject_id === subject.id)
  );

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Gerenciar Matérias - {courseName}</h3>

      {/* Formulário para adicionar matéria */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-4">
        <h4 className="font-medium">Adicionar Matéria ao Curso</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Matéria
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full p-2 border rounded-md"
              disabled={saving}
            >
              <option value="">Selecione uma matéria</option>
              {availableSubjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name} {subject.code ? `(${subject.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Semestre
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={semester}
              onChange={(e) => setSemester(parseInt(e.target.value))}
              className="w-full p-2 border rounded-md"
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Créditos
            </label>
            <input
              type="number"
              min="0"
              max="20"
              value={credits}
              onChange={(e) => setCredits(parseInt(e.target.value))}
              className="w-full p-2 border rounded-md"
              disabled={saving}
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
                className="rounded"
                disabled={saving}
              />
              <span className="text-sm font-medium text-gray-700">Obrigatória</span>
            </label>
          </div>
        </div>

        <button
          onClick={handleAddSubject}
          disabled={!selectedSubjectId || saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Adicionar Matéria
        </button>
      </div>

      {/* Lista de matérias do curso */}
      <div className="space-y-4">
        <h4 className="font-medium">Matérias do Curso</h4>
        
        {courseSubjects.length === 0 ? (
          <p className="text-gray-500">Nenhuma matéria adicionada a este curso ainda.</p>
        ) : (
          <div className="grid gap-2">
            {courseSubjects.map((cs: any) => (
              <div
                key={cs.id}
                className="flex items-center justify-between p-3 bg-white border rounded-lg hover:shadow-sm"
              >
                <div className="flex-1">
                  <div className="font-medium">
                    {cs.subjects?.name}
                    {cs.subjects?.code && (
                      <span className="text-gray-500 ml-2">({cs.subjects.code})</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    Semestre {cs.semester} • {cs.credits} créditos • 
                    {cs.is_required ? ' Obrigatória' : ' Optativa'}
                  </div>
                  {cs.subjects?.description && (
                    <div className="text-sm text-gray-500 mt-1">
                      {cs.subjects.description}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveSubject(cs.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                  title="Remover matéria"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}