'use client'

import { useState, useEffect } from 'react'
import { 
  BookOpen, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  Edit, 
  Trash2,
  GraduationCap,
  FileText,
  Video,
  ClipboardCheck,
  Layers,
  Search,
  X,
  Link2,
  FolderOpen,
  Folder,
  AlertCircle,
  Check
} from 'lucide-react'
import Card from '../../components/Card'
import Spinner from '../../components/ui/Spinner'
import Breadcrumbs from '../../components/ui/Breadcrumbs'
import Button from '../../components/Button'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import CourseStructureManager from '../../components/CourseStructureManager'

interface TreeNode {
  id: string
  type: 'course' | 'module' | 'subject' | 'lesson' | 'test'
  title: string
  children?: TreeNode[]
  data?: any
  parentId?: string
  order?: number
}

interface SubjectOption {
  id: string
  code?: string | null
  name: string
  description?: string | null
  associatedModuleId: string | null
  isAssociatedWithCurrent: boolean
}

export default function StructurePage() {
  const [treeData, setTreeData] = useState<TreeNode[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null)
  const [showAssociateModal, setShowAssociateModal] = useState(false)
  const [associateType, setAssociateType] = useState<'module' | 'subject' | 'lesson' | 'test'>('subject')
  const [parentNode, setParentNode] = useState<TreeNode | null>(null)
  const [availableItems, setAvailableItems] = useState<any[]>([])
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [associating, setAssociating] = useState(false)
  const [viewMode, setViewMode] = useState<'tree' | 'manage'>('tree')
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [subjectOptions, setSubjectOptions] = useState<SubjectOption[]>([])
  const [showAllSubjects, setShowAllSubjects] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchHierarchicalData()
  }, [])

  const fetchHierarchicalData = async () => {
    try {
      setLoading(true)

      // Fetch all data
      const [coursesRes, modulesRes, subjectsRes, lessonsRes, testsRes] = await Promise.all([
        supabase.from('courses').select('*').order('title'),
        supabase.from('course_modules').select('*').order('order_index'),
        supabase.from('subjects').select('id, code, name, description').order('name'),
        supabase.from('lessons').select('*').order('order_index'),
        supabase.from('tests').select('*').order('title')
      ])
      
      // Store courses for manage mode
      setCourses(coursesRes.data || [])
      if (coursesRes.data && coursesRes.data.length > 0 && !selectedCourseId) {
        setSelectedCourseId(coursesRes.data[0].id)
      }

      // Fetch relationships
      const [moduleSubjectsRes, subjectLessonsRes] = await Promise.all([
        supabase.from('module_subjects').select('*').order('order_index'),
        supabase.from('subject_lessons').select('*')
      ])

      const courses = coursesRes.data || []
      const modules = modulesRes.data || []
      const subjects = subjectsRes.data || []
      const lessons = lessonsRes.data || []
      const tests = testsRes.data || []
      const moduleSubjects = moduleSubjectsRes.data || []
      const subjectLessons = subjectLessonsRes.data || []

      // Build tree structure: Course -> Modules -> Subjects -> (Lessons & Tests)
      const tree: TreeNode[] = courses.map((course: any) => {
        const courseNode: TreeNode = {
          id: course.id,
          type: 'course',
          title: course.title,
          data: course,
          children: []
        }

        // Add modules to course
        const courseModules = modules.filter((m: any) => m.course_id === course.id)
        courseModules.forEach((module: any) => {
          const moduleNode: TreeNode = {
            id: module.id,
            type: 'module',
            title: module.title,
            parentId: course.id,
            data: module,
            order: module.order_index,
            children: []
          }

          // Add subjects to module
          const moduleSubjectIds = moduleSubjects
            .filter((ms: any) => ms.module_id === module.id)
            .map((ms: any) => ms.subject_id)
          
          const moduleSubjectsData = subjects.filter((s: any) => moduleSubjectIds.includes(s.id))
          moduleSubjectsData.forEach((subject: any) => {
            const subjectNode: TreeNode = {
              id: subject.id,
              type: 'subject',
              title: subject.code ? `${subject.code} - ${subject.name}` : subject.name,
              parentId: module.id,
              data: subject,
              children: []
            }

            // Add lessons to subject
            const subjectLessonIds = subjectLessons
              .filter((sl: any) => sl.subject_id === subject.id)
              .map((sl: any) => sl.lesson_id)
            
            const subjectLessonsData = lessons.filter((l: any) => subjectLessonIds.includes(l.id))
            subjectLessonsData.forEach((lesson: any) => {
              subjectNode.children!.push({
                id: lesson.id,
                type: 'lesson',
                title: lesson.title,
                parentId: subject.id,
                data: lesson,
                order: lesson.order_index
              })
            })

            // Add tests associated with this subject
            const subjectTests = tests.filter((t: any) => t.subject_id === subject.id)
            subjectTests.forEach((test: any) => {
              subjectNode.children!.push({
                id: test.id,
                type: 'test',
                title: test.title,
                parentId: subject.id,
                data: test
              })
            })

            // Sort lessons by order
            if (subjectNode.children) {
              subjectNode.children.sort((a, b) => {
                if (a.type === 'lesson' && b.type === 'lesson') {
                  return (a.order || 0) - (b.order || 0)
                }
                return 0
              })
            }

            moduleNode.children!.push(subjectNode)
          })

          courseNode.children!.push(moduleNode)
        })

        return courseNode
      })

      setTreeData(tree)
    } catch (error) {
      console.error('Error fetching hierarchical data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })
  }

  const sortSubjectOptions = (subjects: SubjectOption[], currentModuleId?: string | null) => {
    if (!currentModuleId) return [...subjects]

    return [...subjects].sort((a, b) => {
      const getGroup = (subject: SubjectOption) => {
        if (!subject.associatedModuleId) return 0
        if (subject.associatedModuleId === currentModuleId) return 1
        return 2
      }

      const groupDiff = getGroup(a) - getGroup(b)
      if (groupDiff !== 0) return groupDiff

      const nameA = (a.name || '').toLocaleLowerCase('pt-BR')
      const nameB = (b.name || '').toLocaleLowerCase('pt-BR')
      return nameA.localeCompare(nameB, 'pt-BR')
    })
  }

  const updateSubjectAvailableItems = (
    subjects: SubjectOption[],
    shouldShowAll: boolean,
    currentModule?: TreeNode | null
  ) => {
    if (!currentModule || currentModule.type !== 'module') {
      setAvailableItems(shouldShowAll ? subjects : subjects.filter(subject => !subject.associatedModuleId))
      return
    }

    if (shouldShowAll) {
      setAvailableItems(sortSubjectOptions(subjects, currentModule.id))
      return
    }

    setAvailableItems(subjects.filter(subject => !subject.associatedModuleId))
  }

  const toggleSubjectFilterMode = () => {
    setShowAllSubjects(prev => {
      const nextValue = !prev
      const currentModule = parentNode && parentNode.type === 'module' ? parentNode : null

      updateSubjectAvailableItems(subjectOptions, nextValue, currentModule)

      if (!nextValue) {
        setSelectedItems(prevSelected => prevSelected.filter(id => {
          const subject = subjectOptions.find(option => option.id === id)
          return subject ? !subject.associatedModuleId : false
        }))
      }

      return nextValue
    })
  }

  const getNodeIcon = (type: string, expanded?: boolean) => {
    switch (type) {
      case 'course':
        return <BookOpen className="w-4 h-4 text-gold-400" />
      case 'module':
        return expanded ? <FolderOpen className="w-4 h-4 text-blue-400" /> : <Folder className="w-4 h-4 text-blue-400" />
      case 'subject':
        return <GraduationCap className="w-4 h-4 text-green-400" />
      case 'lesson':
        return <FileText className="w-4 h-4 text-purple-400" />
      case 'test':
        return <ClipboardCheck className="w-4 h-4 text-red-400" />
      default:
        return <Layers className="w-4 h-4 text-gold-300" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'course':
        return 'bg-gold-500/20 text-gold-400 border-gold-500/30'
      case 'module':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'subject':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'lesson':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      case 'test':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      default:
        return 'bg-gold-500/20 text-gold-400 border-gold-500/30'
    }
  }

  const handleAssociate = async (parent: TreeNode, type: 'module' | 'subject' | 'lesson' | 'test') => {
    setParentNode(parent)
    setAssociateType(type)
    setSelectedItems([])
    setShowAssociateModal(true)
    setShowAllSubjects(false)

    if (type !== 'subject') {
      setSubjectOptions([])
    }

    // Load available items based on type
    try {
      let data: any[] = []
      
      if (type === 'module' && parent.type === 'course') {
        // Get all modules for this course (including unassociated ones)
        const { data: allModules } = await supabase
          .from('course_modules')
          .select('*')
          .eq('course_id', parent.id)
          .order('order_index')
        
        data = allModules || []
      }
      else if (type === 'subject' && parent.type === 'module') {
        // Get all subjects and track their current module associations
        const [{ data: allSubjects }, { data: subjectLinks }] = await Promise.all([
          supabase.from('subjects').select('id, code, name, description').order('name'),
          supabase.from('module_subjects').select('subject_id, module_id')
        ])

        const associationMap = new Map<string, string>()
        subjectLinks?.forEach((link: any) => {
          if (!associationMap.has(link.subject_id)) {
            associationMap.set(link.subject_id, link.module_id)
          }
        })

        const subjectsWithMetadata: SubjectOption[] = (allSubjects || []).map((subject: any) => ({
          id: subject.id,
          code: subject.code,
          name: subject.name,
          description: subject.description,
          associatedModuleId: associationMap.get(subject.id) || null,
          isAssociatedWithCurrent: associationMap.get(subject.id) === parent.id
        }))

        setSubjectOptions(subjectsWithMetadata)
        updateSubjectAvailableItems(subjectsWithMetadata, false, parent)
        return
      } 
      else if ((type === 'lesson' || type === 'test') && parent.type === 'subject') {
        if (type === 'lesson') {
          // Get all lessons not already associated with this subject
          const { data: allLessons } = await supabase.from('lessons').select('*').order('title')
          const { data: subjectLessons } = await supabase
            .from('subject_lessons')
            .select('lesson_id')
            .eq('subject_id', parent.id)
          
          const associatedIds = subjectLessons?.map((sl: any) => sl.lesson_id) || []
          data = allLessons?.filter((l: any) => !associatedIds.includes(l.id)) || []
        } else {
          // Get all tests not already associated with this subject
          const { data: allTests } = await supabase.from('tests').select('*').order('title')
          data = allTests?.filter((t: any) => t.subject_id !== parent.id) || []
        }
      }
      
      setAvailableItems(data)
    } catch (error) {
      console.error('Error loading available items:', error)
    }
  }

  const saveAssociations = async () => {
    if (!parentNode || selectedItems.length === 0) return

    setAssociating(true)
    try {
      if (associateType === 'subject' && parentNode.type === 'module') {
        // Associate subjects with module
        const associations = selectedItems.map((subjectId, index) => ({
          module_id: parentNode.id,
          subject_id: subjectId,
          order_index: index
        }))

        const { error } = await supabase
          .from('module_subjects')
          .insert(associations)

        if (error) throw error
      } 
      else if (associateType === 'lesson' && parentNode.type === 'subject') {
        // Associate lessons with subject
        const associations = selectedItems.map((lessonId: any) => ({
          subject_id: parentNode.id,
          lesson_id: lessonId
        }))

        const { error } = await supabase
          .from('subject_lessons')
          .insert(associations)

        if (error) throw error
      }
      else if (associateType === 'test' && parentNode.type === 'subject') {
        // Update tests to belong to this subject
        const { error } = await supabase
          .from('tests')
          .update({ subject_id: parentNode.id })
          .in('id', selectedItems)

        if (error) throw error
      }
      
      setShowAssociateModal(false)
      fetchHierarchicalData()
    } catch (error) {
      console.error('Error saving associations:', error)
      alert('Erro ao associar itens')
    } finally {
      setAssociating(false)
    }
  }

  const handleDeleteNode = async (node: TreeNode) => {
    const confirmMessage = node.type === 'module'
      ? `Tem certeza que deseja excluir o módulo "${node.title}"? Isso removerá todas as disciplinas, aulas, testes e dados associados.`
      : node.type === 'subject'
      ? `Tem certeza que deseja excluir a disciplina "${node.title}"? Isso removerá aulas, testes e dados associados.`
      : `Tem certeza que deseja remover "${node.title}" desta estrutura?`

    if (!confirm(confirmMessage)) return

    if (node.type === 'module' || node.type === 'subject') {
      try {
        setLoading(true)

        const response = await fetch('/api/structure/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ type: node.type, id: node.id })
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.error || 'Não foi possível remover este item da estrutura.')
        }

        await fetchHierarchicalData()
      } catch (error) {
        console.error('Error removing node:', error)
        alert('Erro ao remover item da estrutura')
      } finally {
        setLoading(false)
      }
      return
    }

    try {
      setLoading(true)

      if (node.type === 'lesson' && node.parentId) {
        // Remove association between subject and lesson
        const { error } = await supabase
          .from('subject_lessons')
          .delete()
          .eq('subject_id', node.parentId)
          .eq('lesson_id', node.id)

        if (error) throw error
      }
      else if (node.type === 'test' && node.parentId) {
        // Detach test from subject
        const { error } = await supabase
          .from('tests')
          .update({ subject_id: null })
          .eq('id', node.id)

        if (error) throw error
      }

      await fetchHierarchicalData()
    } catch (error) {
      console.error('Error removing node:', error)
      alert('Erro ao remover item')
    } finally {
      setLoading(false)
    }
  }

  const renderTree = (nodes: TreeNode[], level = 0) => {
    return nodes.map((node: any) => {
      const isExpanded = expandedNodes.has(node.id)
      const hasChildren = node.children && node.children.length > 0
      const isSelected = selectedNode?.id === node.id

      return (
        <div key={node.id} className="select-none">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`
              flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer
              hover:bg-navy-800/50 transition-all group
              ${isSelected ? 'bg-navy-800/70 ring-2 ring-gold-500/50' : ''}
            `}
            style={{ paddingLeft: `${level * 24 + 12}px` }}
            onClick={() => {
              setSelectedNode(node)
              if (hasChildren) toggleNode(node.id)
            }}
          >
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleNode(node.id)
                }}
                className="p-0.5 hover:bg-navy-700 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gold-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gold-400" />
                )}
              </button>
            )}
            
            {!hasChildren && <div className="w-5" />}
            
            {getNodeIcon(node.type, isExpanded)}
            
            <span className="flex-1 text-gold-200">{node.title}</span>
            
            <span className={`
              px-2 py-0.5 rounded-full text-xs font-medium border
              ${getTypeColor(node.type)}
            `}>
              {node.type === 'course' ? 'Curso' :
               node.type === 'module' ? 'Módulo' :
               node.type === 'subject' ? 'Disciplina' :
               node.type === 'lesson' ? 'Aula' : 'Teste'}
            </span>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Associate modules button for courses */}
              {node.type === 'course' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAssociate(node, 'module')
                  }}
                  className="p-1 hover:bg-navy-700 rounded"
                  title="Gerenciar Módulos"
                >
                  <Link2 className="w-3 h-3 text-blue-400" />
                </button>
              )}
              
              {/* Associate subjects button for modules */}
              {node.type === 'module' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAssociate(node, 'subject')
                  }}
                  className="p-1 hover:bg-navy-700 rounded"
                  title="Associar Disciplinas"
                >
                  <Link2 className="w-3 h-3 text-green-400" />
                </button>
              )}
              
              {/* Associate lessons/tests button for subjects */}
              {node.type === 'subject' && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAssociate(node, 'lesson')
                    }}
                    className="p-1 hover:bg-navy-700 rounded"
                    title="Associar Aulas"
                  >
                    <Link2 className="w-3 h-3 text-purple-400" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAssociate(node, 'test')
                    }}
                    className="p-1 hover:bg-navy-700 rounded"
                    title="Associar Testes"
                  >
                    <Link2 className="w-3 h-3 text-red-400" />
                  </button>
                </>
              )}
              
              {/* Delete button (only for modules and associations) */}
              {(node.type === 'module' || (node.type !== 'course' && node.parentId)) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteNode(node)
                  }}
                  className="p-1 hover:bg-navy-700 rounded"
                  title={node.type === 'module' ? 'Excluir Módulo' : 'Remover da Estrutura'}
                >
                  <Trash2 className="w-3 h-3 text-red-400" />
                </button>
              )}
            </div>
          </motion.div>

          <AnimatePresence>
            {isExpanded && hasChildren && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                {renderTree(node.children!, level + 1)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )
    })
  }

  const filterTree = (nodes: TreeNode[], term: string): TreeNode[] => {
    return nodes.reduce((acc: TreeNode[], node) => {
      const nodeMatches = node.title.toLowerCase().includes(term.toLowerCase())
      const filteredChildren = node.children ? filterTree(node.children, term) : []
      
      if (nodeMatches || filteredChildren.length > 0) {
        acc.push({
          ...node,
          children: filteredChildren
        })
        // Auto-expand nodes that match search
        if (term && (nodeMatches || filteredChildren.length > 0)) {
          expandedNodes.add(node.id)
        }
      }
      
      return acc
    }, [])
  }

  const displayTree = searchTerm ? filterTree(treeData, searchTerm) : treeData

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs className="mb-2" />
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gold flex items-center gap-2">
            <Layers className="w-8 h-8" />
            Estrutura Hierárquica
          </h1>
          <p className="text-gold-300 mt-1">
            Visualize a estrutura: Curso → Módulos → Disciplinas → Aulas/Testes
          </p>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-2">
        <Button
          variant={viewMode === 'tree' ? 'primary' : 'secondary'}
          onClick={() => setViewMode('tree')}
          icon={<Folder className="w-4 h-4" />}
        >
          Visualização em Árvore
        </Button>
        <Button
          variant={viewMode === 'manage' ? 'primary' : 'secondary'}
          onClick={() => setViewMode('manage')}
          icon={<Edit className="w-4 h-4" />}
        >
          Gerenciar Ordenação
        </Button>
      </div>

      {/* Info Box */}
      <Card variant="gradient">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-gold-400 mt-0.5" />
          <div className="text-sm text-gold-300">
            <p className="font-semibold text-gold-200 mb-1">Como funciona:</p>
            <ul className="space-y-1">
              <li>• <span className="text-gold-400">Cursos</span>: Clique no ícone de link para gerenciar módulos</li>
              <li>• <span className="text-blue-400">Módulos</span>: Crie na página de Módulos e associe aos cursos</li>
              <li>• <span className="text-green-400">Disciplinas</span>: Associe disciplinas existentes aos módulos</li>
              <li>• <span className="text-purple-400">Aulas</span> e <span className="text-red-400">Testes</span>: Associe às disciplinas</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Search */}
      <Card>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-400" />
          <input
            type="text"
            placeholder="Buscar na estrutura..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
        </div>
      </Card>

      {/* Conditional Rendering based on View Mode */}
      {viewMode === 'tree' ? (
        /* Tree View */
        <Card className="min-h-[500px]">
          <div className="space-y-1">
            {displayTree.length > 0 ? (
              renderTree(displayTree)
            ) : (
              <div className="text-center py-12">
                <Layers className="w-16 h-16 text-gold-500/30 mx-auto mb-4" />
                <p className="text-gold-300">
                  {searchTerm ? 'Nenhum item encontrado' : 'Nenhum curso cadastrado'}
                </p>
              </div>
            )}
          </div>
        </Card>
      ) : (
        /* Management View */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Course Selector */}
          <div className="lg:col-span-1">
            <Card>
              <h3 className="font-semibold text-gold mb-4">Selecione o Curso</h3>
              <div className="space-y-2">
                {courses.map((course: any) => (
                  <button
                    key={course.id}
                    onClick={() => setSelectedCourseId(course.id)}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      selectedCourseId === course.id
                        ? 'bg-gold-500/20 border border-gold-500/50'
                        : 'bg-navy-800/30 hover:bg-navy-800/50 border border-navy-700'
                    }`}
                  >
                    <span className="text-sm font-medium text-gold-200">{course.title}</span>
                  </button>
                ))}
              </div>
            </Card>
          </div>
          
          {/* Course Structure Manager */}
          <div className="lg:col-span-3">
            {selectedCourseId && courses.find((c: any) => c.id === selectedCourseId) ? (
              <CourseStructureManager
                courseId={selectedCourseId}
                courseName={courses.find((c: any) => c.id === selectedCourseId)?.title || ''}
                canManage={true}
              />
            ) : (
              <Card className="text-center py-12">
                <Layers className="w-12 h-12 text-gold-400/30 mx-auto mb-4" />
                <p className="text-gold-300/70">
                  Selecione um curso para gerenciar sua estrutura
                </p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Associate Items Modal */}
      {showAssociateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gold flex items-center gap-2">
                <Link2 className="w-6 h-6" />
                {associateType === 'module' ? 'Gerenciar Módulos' :
                 `Associar ${associateType === 'subject' ? 'Disciplinas' : 
                           associateType === 'lesson' ? 'Aulas' : 'Testes'}`}
              </h2>
              <button
                onClick={() => setShowAssociateModal(false)}
                className="text-gold-400 hover:text-gold-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mb-4">
              {associateType === 'subject' && subjectOptions.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4 text-sm text-gold-300">
                  <p>
                    {showAllSubjects
                      ? 'Exibindo todas as disciplinas. As não associadas aparecem primeiro.'
                      : 'Exibindo apenas disciplinas disponíveis para associação.'}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSubjectFilterMode}
                  >
                    {showAllSubjects ? 'Ver somente não associadas' : 'Ver todas as disciplinas'}
                  </Button>
                </div>
              )}

              {availableItems.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-gold-500/30 mx-auto mb-3" />
                  <p className="text-gold-300">
                    {associateType === 'module' ? 'Nenhum módulo criado para este curso' :
                     `Nenhum ${associateType === 'subject' ? 'disciplina disponível' : 
                              associateType === 'lesson' ? 'aula disponível' : 'teste disponível'}`}
                  </p>
                  <p className="text-gold-400 text-sm mt-2">
                    {associateType === 'module' ? 
                     'Crie módulos na página de Módulos e eles aparecerão automaticamente aqui' :
                     'Crie novos itens na página correspondente antes de associá-los'}
                  </p>
                  {associateType === 'subject' && subjectOptions.length > 0 && !showAllSubjects && (
                    <div className="mt-4">
                      <Button variant="secondary" size="sm" onClick={toggleSubjectFilterMode}>
                        Exibir todas as disciplinas
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {availableItems.map((item: any) => {
                    const isSubjectAssociation = associateType === 'subject'
                    const isUnavailableSubject = isSubjectAssociation && Boolean(item.associatedModuleId)
                    const statusText = !isSubjectAssociation
                      ? null
                      : !item.associatedModuleId
                      ? 'Disponível para associação'
                      : item.isAssociatedWithCurrent
                      ? 'Já faz parte deste módulo'
                      : 'Associada a outro módulo'
                    const statusColor = !isSubjectAssociation
                      ? ''
                      : !item.associatedModuleId
                      ? 'text-green-400'
                      : item.isAssociatedWithCurrent
                      ? 'text-gold-400'
                      : 'text-orange-300'

                    return (
                      <label
                        key={item.id}
                        className={`flex items-center gap-3 p-3 bg-navy-900/50 rounded-lg ${
                          isUnavailableSubject ? 'opacity-60 cursor-not-allowed' : 'hover:bg-navy-900/70 cursor-pointer'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item.id)}
                          onChange={(e) => {
                            setSelectedItems(prev => {
                              if (e.target.checked) {
                                return prev.includes(item.id) ? prev : [...prev, item.id]
                              }
                              return prev.filter((id) => id !== item.id)
                            })
                          }}
                          disabled={isUnavailableSubject}
                          className="w-4 h-4 bg-navy-900/50 border-navy-600 rounded text-gold-500 focus:ring-gold-500 disabled:opacity-50"
                        />
                        <div className="flex-1">
                          <p className="text-gold-200 font-medium">
                            {item.title || (item.code ? `${item.code} - ${item.name}` : item.name)}
                          </p>
                          {item.description && (
                            <p className="text-gold-400 text-sm">{item.description}</p>
                          )}
                          {statusText && (
                            <p className={`text-xs mt-1 ${statusColor}`}>
                              {statusText}
                            </p>
                          )}
                        </div>
                        {selectedItems.includes(item.id) && (
                          <Check className="w-5 h-5 text-green-400" />
                        )}
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-gold-500/20">
              <p className="text-gold-300 text-sm">
                {selectedItems.length} {selectedItems.length === 1 ? 'item selecionado' : 'itens selecionados'}
              </p>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowAssociateModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  onClick={saveAssociations}
                  disabled={selectedItems.length === 0 || associating}
                >
                  {associating ? 'Confirmando...' : 'Confirmar'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
