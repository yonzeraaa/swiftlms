'use client';

import { useState, useEffect } from 'react';
import {
  checkSubjectManagementPermission,
  getSubjectsForCourse,
  addSubjectToCourse,
  removeSubjectFromCourse
} from '@/lib/actions/subject-manager';
import { Tables } from '@/lib/database.types';
import { Plus, X, Loader2, BookOpen, Award } from 'lucide-react';
import Card from './Card';
import Button from './Button';

type Subject = Tables<'subjects'>;
type CourseSubject = Tables<'course_subjects'>;

interface SubjectManagerProps {
  courseId: string;
  courseName: string;
  instructorId?: string;
}

export default function SubjectManager({ courseId, courseName, instructorId }: SubjectManagerProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [courseSubjects, setCourseSubjects] = useState<CourseSubject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [orderIndex, setOrderIndex] = useState(1);
  const [credits, setCredits] = useState(4);
  const [isRequired, setIsRequired] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canManage, setCanManage] = useState(false);

  useEffect(() => {
    loadData();
    checkUserRole();
  }, [courseId, instructorId]);

  async function checkUserRole() {
    try {
      const result = await checkSubjectManagementPermission(instructorId);

      if (result.success) {
        setCanManage(result.canManage);
      } else {
        console.error('Erro ao verificar papel do usuário:', result.error);
        setCanManage(false);
      }
    } catch (error) {
      console.error('Erro ao verificar papel do usuário:', error);
      setCanManage(false);
    }
  }

  async function loadData() {
    try {
      setLoading(true);

      const result = await getSubjectsForCourse(courseId);

      if (result.success) {
        setSubjects(result.subjects);
        setCourseSubjects(result.courseSubjects);
      } else {
        console.error('Erro ao carregar dados:', result.error);
      }
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

      const result = await addSubjectToCourse(courseId, selectedSubjectId, credits, isRequired);

      if (!result.success) {
        alert(result.error || 'Erro ao adicionar disciplina ao curso');
        return;
      }

      // Recarregar dados
      await loadData();

      // Limpar formulário
      setSelectedSubjectId('');
      setOrderIndex(1);
      setCredits(4);
      setIsRequired(true);
    } catch (error: any) {
      console.error('Erro ao adicionar disciplina:', error);
      alert(`Erro ao adicionar disciplina ao curso: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveSubject(courseSubjectId: string) {
    if (!confirm('Tem certeza que deseja remover esta disciplina do curso?')) return;

    try {
      const result = await removeSubjectFromCourse(courseSubjectId);

      if (!result.success) {
        alert(result.error || 'Erro ao remover disciplina do curso');
        return;
      }

      // Recarregar dados
      await loadData();
    } catch (error: any) {
      console.error('Erro ao remover disciplina:', error);
      alert(`Erro ao remover disciplina do curso: ${error.message || 'Erro desconhecido'}`);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  // Filtrar disciplinas que ainda não foram adicionadas ao curso
  const availableSubjects = subjects.filter(
    subject => !courseSubjects.some(cs => cs.subject_id === subject.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-gold mb-4">
        <BookOpen className="w-5 h-5" />
        <h3 className="text-lg font-semibold">{courseName}</h3>
      </div>

      {/* Formulário para adicionar disciplina */}
      {canManage ? (
        <Card className="bg-navy-800/50">
          <h4 className="font-medium text-gold mb-4">Adicionar Disciplina ao Curso</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gold-200 mb-2">
              Disciplina
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
              disabled={saving}
            >
              <option value="">Selecione uma disciplina</option>
              {availableSubjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name} {subject.code ? `(${subject.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gold-200 mb-2">
              Créditos
            </label>
            <input
              type="number"
              min="0"
              max="20"
              value={credits}
              onChange={(e) => setCredits(parseInt(e.target.value))}
              className="w-full px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
              disabled={saving}
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
                className="w-4 h-4 bg-navy-900/50 border-navy-600 rounded text-gold-500 focus:ring-gold-500"
                disabled={saving}
              />
              <span className="text-sm font-medium text-gold-200">Obrigatória</span>
            </label>
          </div>
        </div>

        <Button
          onClick={handleAddSubject}
          disabled={!selectedSubjectId || saving}
          variant="primary"
          icon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        >
          Adicionar Disciplina
        </Button>
      </Card>
      ) : (
        <Card className="bg-navy-800/30 border-yellow-500/20">
          <div className="flex items-center gap-2 text-yellow-400">
            <Award className="w-5 h-5" />
            <p className="text-sm">Apenas administradores e instrutores do curso podem adicionar ou remover disciplinas.</p>
          </div>
        </Card>
      )}

      {/* Lista de disciplinas do curso */}
      <div className="space-y-4">
        <h4 className="font-medium text-gold flex items-center gap-2">
          <Award className="w-5 h-5 text-gold-500" />
          Disciplinas do Curso
        </h4>
        
        {courseSubjects.length === 0 ? (
          <Card className="text-center py-8">
            <p className="text-gold-300">Nenhuma disciplina adicionada a este curso ainda.</p>
          </Card>
        ) : (
          <div className="grid gap-3">
            {courseSubjects.map((cs: any) => (
              <Card
                key={cs.id}
                className="hover:shadow-2xl transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-gold">
                      {cs.subjects?.name}
                      {cs.subjects?.code && (
                        <span className="text-gold-400 ml-2">({cs.subjects.code})</span>
                      )}
                    </div>
                    <div className="text-sm text-gold-300 mt-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-navy-700 text-gold-200 mr-2">
                        {cs.credits} créditos
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        cs.is_required ? 'bg-gold-500/20 text-gold-400' : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {cs.is_required ? 'Obrigatória' : 'Optativa'}
                      </span>
                    </div>
                    {cs.subjects?.description && (
                      <div className="text-sm text-gold-300/70 mt-2">
                        {cs.subjects.description}
                      </div>
                    )}
                  </div>
                  {canManage && (
                    <button
                      onClick={() => handleRemoveSubject(cs.id)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors ml-4"
                      title="Remover disciplina"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Resumo */}
      <Card className="bg-navy-800/30 border-gold-500/20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-gold-400 text-sm">Total de Disciplinas</p>
            <p className="text-2xl font-bold text-gold mt-1">{courseSubjects.length}</p>
          </div>
          <div>
            <p className="text-gold-400 text-sm">Total de Créditos</p>
            <p className="text-2xl font-bold text-gold mt-1">
              {courseSubjects.reduce((acc: number, cs: any) => acc + (cs.credits || 0), 0)}
            </p>
          </div>
          <div>
            <p className="text-gold-400 text-sm">Disciplinas Obrigatórias</p>
            <p className="text-2xl font-bold text-gold mt-1">
              {courseSubjects.filter((cs: any) => cs.is_required).length}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}