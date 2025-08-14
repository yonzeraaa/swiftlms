'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  BookOpen, 
  Layers, 
  GraduationCap, 
  Video,
  Plus,
  ChevronRight,
  ChevronDown,
  Settings,
  GripVertical,
  Save,
  X,
  AlertCircle
} from 'lucide-react';
import Card from './Card';
import Button from './Button';
import OrderableList from './OrderableList';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Module {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
}

interface Subject {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
}

interface ModuleSubject {
  id: string;
  module_id: string;
  subject_id: string;
  order_index: number | null;
  subjects?: Subject;
}

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  module_id: string | null;
}

interface CourseStructureManagerProps {
  courseId: string;
  courseName: string;
  canManage?: boolean;
}

interface SortableSubjectProps {
  subject: ModuleSubject;
  index: number;
  isDragging?: boolean;
}

function SortableSubject({ subject, index }: SortableSubjectProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: subject.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-2 bg-navy-800/30 rounded-lg ${
        isDragging ? 'ring-2 ring-gold-500/50' : ''
      } transition-all`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab hover:cursor-grabbing text-gold-400/50 hover:text-gold-400"
      >
        <GripVertical className="w-4 h-4" />
      </div>
      <span className="text-xs text-gold-400/50 w-6">{index + 1}.</span>
      <div className="flex-1">
        <span className="text-sm text-gold-200">
          {subject.subjects?.name}
        </span>
        {subject.subjects?.code && (
          <span className="text-xs text-gold-400/70 ml-2">
            ({subject.subjects.code})
          </span>
        )}
      </div>
    </div>
  );
}

export default function CourseStructureManager({ 
  courseId, 
  courseName,
  canManage = false 
}: CourseStructureManagerProps) {
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [moduleSubjects, setModuleSubjects] = useState<Record<string, ModuleSubject[]>>({});
  const [lessons, setLessons] = useState<Record<string, Lesson[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [editMode, setEditMode] = useState<'modules' | 'subjects' | 'lessons' | null>(null);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [draggingModuleId, setDraggingModuleId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const supabase = createClient();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadCourseStructure();
  }, [courseId]);

  async function loadCourseStructure() {
    try {
      setLoading(true);

      // Carregar módulos do curso
      const { data: modulesData, error: modulesError } = await supabase
        .from('course_modules')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index');

      if (modulesError) throw modulesError;
      setModules(modulesData || []);

      // Para cada módulo, carregar suas disciplinas e aulas
      const moduleSubjectsMap: Record<string, ModuleSubject[]> = {};
      const lessonsMap: Record<string, Lesson[]> = {};

      for (const module of (modulesData || [])) {
        // Carregar disciplinas do módulo
        const { data: subjectsData } = await supabase
          .from('module_subjects')
          .select('*, subjects(*)')
          .eq('module_id', module.id)
          .order('order_index');

        moduleSubjectsMap[module.id] = subjectsData || [];

        // Carregar aulas do módulo
        const { data: lessonsData } = await supabase
          .from('lessons')
          .select('*')
          .eq('module_id', module.id)
          .order('order_index');

        lessonsMap[module.id] = lessonsData || [];
      }

      setModuleSubjects(moduleSubjectsMap);
      setLessons(lessonsMap);

    } catch (error) {
      console.error('Erro ao carregar estrutura do curso:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleReorderModules(reorderedItems: any[]) {
    try {
      const moduleIds = reorderedItems.map(item => item.id);
      
      const { error } = await supabase.rpc('reorder_course_modules' as any, {
        p_course_id: courseId,
        p_module_ids: moduleIds
      });

      if (error) throw error;
      
      // Atualizar estado local
      setModules(reorderedItems);
    } catch (error: any) {
      console.error('Erro ao reordenar módulos:', error);
      throw new Error('Erro ao salvar nova ordem dos módulos');
    }
  }

  async function handleReorderSubjects(moduleId: string, reorderedItems: any[]) {
    try {
      const subjectIds = reorderedItems.map(item => item.subject_id || item.id);
      
      const { error } = await supabase.rpc('reorder_module_subjects' as any, {
        p_module_id: moduleId,
        p_subject_ids: subjectIds
      });

      if (error) throw error;
      
      // Atualizar estado local
      setModuleSubjects(prev => ({
        ...prev,
        [moduleId]: reorderedItems
      }));
    } catch (error: any) {
      console.error('Erro ao reordenar disciplinas:', error);
      throw new Error('Erro ao salvar nova ordem das disciplinas');
    }
  }

  async function handleReorderLessons(moduleId: string, reorderedItems: any[]) {
    try {
      const lessonIds = reorderedItems.map(item => item.id);
      
      const { error } = await supabase.rpc('reorder_lessons' as any, {
        p_module_id: moduleId,
        p_lesson_ids: lessonIds
      });

      if (error) throw error;
      
      // Atualizar estado local
      setLessons(prev => ({
        ...prev,
        [moduleId]: reorderedItems
      }));
    } catch (error: any) {
      console.error('Erro ao reordenar aulas:', error);
      throw new Error('Erro ao salvar nova ordem das aulas');
    }
  }

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-gold-500" />
          <div>
            <h2 className="text-xl font-bold text-gold">{courseName}</h2>
            <p className="text-sm text-gold-400/70">Estrutura Hierárquica do Curso</p>
          </div>
        </div>
        
        {canManage && editMode === null && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setEditMode('modules')}
            icon={<Settings className="w-4 h-4" />}
          >
            Gerenciar Estrutura
          </Button>
        )}

        {editMode && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditMode(null);
              setEditingModuleId(null);
            }}
            icon={<X className="w-4 h-4" />}
          >
            Fechar Edição
          </Button>
        )}
      </div>

      {/* Modo de Edição - Reordenar Módulos */}
      {editMode === 'modules' && (
        <Card className="bg-navy-800/50 border-gold-500/30">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-gold mb-4">
              <Layers className="w-5 h-5" />
              <h3 className="font-semibold">Reordenar Módulos do Curso</h3>
            </div>
            <OrderableList
              items={modules.map(m => ({
                id: m.id,
                name: m.title,
                description: m.description || undefined
              }))}
              onReorder={handleReorderModules}
              canEdit={canManage}
            />
          </div>
        </Card>
      )}

      {/* Modo de Edição - Reordenar Disciplinas de um Módulo */}
      {editMode === 'subjects' && editingModuleId && (
        <Card className="bg-navy-800/50 border-gold-500/30">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-gold mb-4">
              <GraduationCap className="w-5 h-5" />
              <h3 className="font-semibold">
                Reordenar Disciplinas - {modules.find(m => m.id === editingModuleId)?.title}
              </h3>
            </div>
            <OrderableList
              items={(moduleSubjects[editingModuleId] || []).map(ms => ({
                id: ms.id,
                subject_id: ms.subject_id,
                name: ms.subjects?.name || 'Disciplina sem nome',
                description: ms.subjects?.code || undefined
              }))}
              onReorder={(items) => handleReorderSubjects(editingModuleId, items)}
              canEdit={canManage}
            />
          </div>
        </Card>
      )}

      {/* Modo de Edição - Reordenar Aulas de um Módulo */}
      {editMode === 'lessons' && editingModuleId && (
        <Card className="bg-navy-800/50 border-gold-500/30">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-gold mb-4">
              <Video className="w-5 h-5" />
              <h3 className="font-semibold">
                Reordenar Aulas - {modules.find(m => m.id === editingModuleId)?.title}
              </h3>
            </div>
            <OrderableList
              items={(lessons[editingModuleId] || []).map(l => ({
                id: l.id,
                name: l.title,
                description: l.description || undefined
              }))}
              onReorder={(items) => handleReorderLessons(editingModuleId, items)}
              canEdit={canManage}
            />
          </div>
        </Card>
      )}

      {/* Estrutura do Curso */}
      <div className="space-y-3">
        {modules.map((module, moduleIndex) => {
          const isExpanded = expandedModules.has(module.id);
          const moduleSubjectsList = moduleSubjects[module.id] || [];
          const moduleLessonsList = lessons[module.id] || [];

          return (
            <Card key={module.id} className="overflow-hidden">
              {/* Header do Módulo */}
              <div
                className="flex items-center gap-3 cursor-pointer hover:bg-navy-800/30 -m-4 p-4 transition-colors"
                onClick={() => toggleModule(module.id)}
              >
                <button className="text-gold-400 hover:text-gold-300 transition-colors">
                  {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>
                
                <div className="flex items-center gap-2 flex-1">
                  <Layers className="w-5 h-5 text-gold-500" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gold">
                      Módulo {moduleIndex + 1}: {module.title}
                    </h3>
                    {module.description && (
                      <p className="text-sm text-gold-400/70">{module.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gold-400">
                    <span>{moduleSubjectsList.length} disciplinas</span>
                    <span>•</span>
                    <span>{moduleLessonsList.length} aulas</span>
                  </div>
                </div>

                {canManage && editMode === null && (
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditMode('lessons');
                        setEditingModuleId(module.id);
                      }}
                      icon={<Video className="w-4 h-4" />}
                    >
                      Ordenar Aulas
                    </Button>
                  </div>
                )}
              </div>

              {/* Conteúdo Expandido do Módulo */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-navy-700 space-y-4">
                  {/* Disciplinas do Módulo */}
                  {moduleSubjectsList.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gold-300 flex items-center gap-2">
                          <GraduationCap className="w-4 h-4" />
                          Disciplinas
                        </h4>
                        {canManage && hasChanges[module.id] && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                loadCourseStructure();
                                setHasChanges(prev => ({ ...prev, [module.id]: false }));
                              }}
                              disabled={saving[module.id]}
                            >
                              <X className="w-3 h-3" />
                              Cancelar
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={async () => {
                                setSaving(prev => ({ ...prev, [module.id]: true }));
                                try {
                                  await handleReorderSubjects(module.id, moduleSubjectsList);
                                  setHasChanges(prev => ({ ...prev, [module.id]: false }));
                                } catch (error) {
                                  console.error('Erro ao salvar:', error);
                                } finally {
                                  setSaving(prev => ({ ...prev, [module.id]: false }));
                                }
                              }}
                              disabled={saving[module.id]}
                            >
                              <Save className="w-3 h-3" />
                              {saving[module.id] ? 'Salvando...' : 'Salvar'}
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="grid gap-2 ml-6">
                        {canManage ? (
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(event: DragEndEvent) => {
                              const { active, over } = event;
                              
                              if (over && active.id !== over.id) {
                                const oldIndex = moduleSubjectsList.findIndex((item) => item.id === active.id);
                                const newIndex = moduleSubjectsList.findIndex((item) => item.id === over.id);
                                
                                const newItems = arrayMove(moduleSubjectsList, oldIndex, newIndex);
                                setModuleSubjects(prev => ({
                                  ...prev,
                                  [module.id]: newItems
                                }));
                                setHasChanges(prev => ({ ...prev, [module.id]: true }));
                              }
                            }}
                          >
                            <SortableContext
                              items={moduleSubjectsList.map(item => item.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              {moduleSubjectsList.map((ms, index) => (
                                <SortableSubject 
                                  key={ms.id}
                                  subject={ms}
                                  index={index}
                                />
                              ))}
                            </SortableContext>
                          </DndContext>
                        ) : (
                          moduleSubjectsList.map((ms, index) => (
                            <div
                              key={ms.id}
                              className="flex items-center gap-2 p-2 bg-navy-800/30 rounded-lg"
                            >
                              <span className="text-xs text-gold-400/50 w-6">{index + 1}.</span>
                              <div className="flex-1">
                                <span className="text-sm text-gold-200">
                                  {ms.subjects?.name}
                                </span>
                                {ms.subjects?.code && (
                                  <span className="text-xs text-gold-400/70 ml-2">
                                    ({ms.subjects.code})
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* Aulas do Módulo */}
                  {moduleLessonsList.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gold-300 flex items-center gap-2">
                        <Video className="w-4 h-4" />
                        Aulas
                      </h4>
                      <div className="grid gap-2 ml-6">
                        {moduleLessonsList.map((lesson, index) => (
                          <div
                            key={lesson.id}
                            className="flex items-center gap-2 p-2 bg-navy-800/30 rounded-lg"
                          >
                            <span className="text-xs text-gold-400/50 w-6">{index + 1}.</span>
                            <div className="flex-1">
                              <span className="text-sm text-gold-200">
                                {lesson.title}
                              </span>
                              {lesson.description && (
                                <p className="text-xs text-gold-400/70 mt-1">
                                  {lesson.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {moduleSubjectsList.length === 0 && moduleLessonsList.length === 0 && (
                    <p className="text-center text-gold-400/50 py-4">
                      Este módulo ainda não possui conteúdo
                    </p>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {modules.length === 0 && (
        <Card className="text-center py-12">
          <BookOpen className="w-12 h-12 text-gold-400/30 mx-auto mb-4" />
          <p className="text-gold-300/70">Este curso ainda não possui módulos cadastrados</p>
        </Card>
      )}
    </div>
  );
}