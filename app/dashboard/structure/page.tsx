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
  Check,
  GripVertical,
  Loader2
} from 'lucide-react'
import Card from '../../components/Card'
import Button from '../../components/Button'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  Active,
  Over
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import {
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface TreeNode {
  id: string
  type: 'course' | 'module' | 'subject' | 'lesson' | 'test'
  title: string
  children?: TreeNode[]
  data?: any
  parentId?: string
  order?: number
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
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createClient()
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

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
        supabase.from('subjects').select('*').order('name'),
        supabase.from('lessons').select('*').order('order_index'),
        supabase.from('tests').select('*').order('title')
      ])

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
      const tree: TreeNode[] = courses.map(course => {
        const courseNode: TreeNode = {
          id: course.id,
          type: 'course',
          title: course.title,
          data: course,
          children: []
        }

        // Add modules to course
        const courseModules = modules.filter(m => m.course_id === course.id)
        courseModules.forEach(module => {
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
            .filter(ms => ms.module_id === module.id)
            .map(ms => ms.subject_id)
          
          const moduleSubjectsData = subjects.filter(s => moduleSubjectIds.includes(s.id))
          moduleSubjectsData.forEach(subject => {
            const subjectNode: TreeNode = {
              id: subject.id,
              type: 'subject',
              title: subject.name,
              parentId: module.id,
              data: subject,
              children: []
            }

            // Add lessons to subject
            const subjectLessonIds = subjectLessons
              .filter(sl => sl.subject_id === subject.id)
              .map(sl => sl.lesson_id)
            
            const subjectLessonsData = lessons.filter(l => subjectLessonIds.includes(l.id))
            subjectLessonsData.forEach(lesson => {
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
            const subjectTests = tests.filter(t => t.subject_id === subject.id)
            subjectTests.forEach(test => {
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
        // Get all subjects not already associated with this module
        const { data: allSubjects } = await supabase.from('subjects').select('*').order('name')
        const { data: moduleSubjects } = await supabase
          .from('module_subjects')
          .select('subject_id')
          .eq('module_id', parent.id)
        
        const associatedIds = moduleSubjects?.map(ms => ms.subject_id) || []
        data = allSubjects?.filter(s => !associatedIds.includes(s.id)) || []
      } 
      else if ((type === 'lesson' || type === 'test') && parent.type === 'subject') {
        if (type === 'lesson') {
          // Get all lessons not already associated with this subject
          const { data: allLessons } = await supabase.from('lessons').select('*').order('title')
          const { data: subjectLessons } = await supabase
            .from('subject_lessons')
            .select('lesson_id')
            .eq('subject_id', parent.id)
          
          const associatedIds = subjectLessons?.map(sl => sl.lesson_id) || []
          data = allLessons?.filter(l => !associatedIds.includes(l.id)) || []
        } else {
          // Get all tests not already associated with this subject
          const { data: allTests } = await supabase.from('tests').select('*').order('title')
          data = allTests?.filter(t => t.subject_id !== parent.id) || []
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
        const associations = selectedItems.map(lessonId => ({
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
      ? `Tem certeza que deseja excluir o módulo "${node.title}"? Isso removerá todas as associações com disciplinas.`
      : `Tem certeza que deseja remover "${node.title}" desta estrutura?`
    
    if (!confirm(confirmMessage)) return

    try {
      if (node.type === 'module') {
        // Delete the module (cascades will handle associations)
        const { error } = await supabase
          .from('course_modules')
          .delete()
          .eq('id', node.id)
        
        if (error) throw error
      } 
      else if (node.type === 'subject' && node.parentId) {
        // Remove association between module and subject
        const { error } = await supabase
          .from('module_subjects')
          .delete()
          .eq('module_id', node.parentId)
          .eq('subject_id', node.id)
        
        if (error) throw error
      }
      else if (node.type === 'lesson' && node.parentId) {
        // Remove association between subject and lesson
        const { error } = await supabase
          .from('subject_lessons')
          .delete()
          .eq('subject_id', node.parentId)
          .eq('lesson_id', node.id)
        
        if (error) throw error
      }
      else if (node.type === 'test' && node.parentId) {
        // Remove test from subject
        const { error } = await supabase
          .from('tests')
          .update({ subject_id: null })
          .eq('id', node.id)
        
        if (error) throw error
      }
      
      fetchHierarchicalData()
    } catch (error) {
      console.error('Error removing node:', error)
      alert('Erro ao remover item')
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over?.id as string || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setOverId(null)

    if (!over || active.id === over.id) return

    const activeNode = findNodeById(treeData, active.id as string)
    const overNode = findNodeById(treeData, over.id as string)

    if (!activeNode || !overNode) return
    
    // Only allow reordering items of the same type and same parent
    if (activeNode.type !== overNode.type) return
    if (activeNode.parentId !== overNode.parentId) return

    setIsSaving(true)
    try {
      if (activeNode.type === 'module' && activeNode.parentId === overNode.parentId) {
        await reorderModules(activeNode, overNode)
      } else if (activeNode.type === 'subject' && activeNode.parentId === overNode.parentId) {
        await reorderSubjects(activeNode, overNode, activeNode.parentId!)
      } else if (activeNode.type === 'lesson' && activeNode.parentId === overNode.parentId) {
        await reorderLessons(activeNode, overNode)
      }
      
      await fetchHierarchicalData()
    } catch (error) {
      console.error('Error reordering:', error)
      alert('Erro ao reordenar itens')
    } finally {
      setIsSaving(false)
    }
  }

  const findNodeById = (nodes: TreeNode[], id: string): TreeNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node
      if (node.children) {
        const found = findNodeById(node.children, id)
        if (found) return found
      }
    }
    return null
  }

  const reorderModules = async (activeNode: TreeNode, overNode: TreeNode) => {
    const parentId = activeNode.parentId
    if (!parentId) return

    // Get all modules for this course
    const { data: modules } = await supabase
      .from('course_modules')
      .select('*')
      .eq('course_id', parentId)
      .order('order_index')

    if (!modules) return

    const activeIndex = modules.findIndex(m => m.id === activeNode.id)
    const overIndex = modules.findIndex(m => m.id === overNode.id)

    if (activeIndex === -1 || overIndex === -1) return

    // Reorder array
    const reorderedModules = arrayMove(modules, activeIndex, overIndex)

    // Update all affected modules
    for (let i = 0; i < reorderedModules.length; i++) {
      await supabase
        .from('course_modules')
        .update({ order_index: i })
        .eq('id', reorderedModules[i].id)
    }
  }

  const reorderSubjects = async (activeNode: TreeNode, overNode: TreeNode, moduleId: string) => {
    // Get all subjects for this module
    const { data: moduleSubjects } = await supabase
      .from('module_subjects')
      .select('*')
      .eq('module_id', moduleId)
      .order('order_index')

    if (!moduleSubjects) return

    const activeIndex = moduleSubjects.findIndex(ms => ms.subject_id === activeNode.id)
    const overIndex = moduleSubjects.findIndex(ms => ms.subject_id === overNode.id)

    if (activeIndex === -1 || overIndex === -1) return

    // Reorder array
    const reordered = arrayMove(moduleSubjects, activeIndex, overIndex)

    // Update all affected subjects
    for (let i = 0; i < reordered.length; i++) {
      await supabase
        .from('module_subjects')
        .update({ order_index: i })
        .eq('module_id', moduleId)
        .eq('subject_id', reordered[i].subject_id)
    }
  }

  const reorderLessons = async (activeNode: TreeNode, overNode: TreeNode) => {
    // Get all lessons that share the same parent (through subject_lessons)
    const { data: subjectLessons } = await supabase
      .from('subject_lessons')
      .select('lesson_id')
      .eq('subject_id', activeNode.parentId!)

    if (!subjectLessons) return

    const lessonIds = subjectLessons.map(sl => sl.lesson_id)
    
    const { data: lessons } = await supabase
      .from('lessons')
      .select('*')
      .in('id', lessonIds)
      .order('order_index')

    if (!lessons) return

    const activeIndex = lessons.findIndex(l => l.id === activeNode.id)
    const overIndex = lessons.findIndex(l => l.id === overNode.id)

    if (activeIndex === -1 || overIndex === -1) return

    // Reorder array
    const reordered = arrayMove(lessons, activeIndex, overIndex)

    // Update all affected lessons
    for (let i = 0; i < reordered.length; i++) {
      await supabase
        .from('lessons')
        .update({ order_index: i })
        .eq('id', reordered[i].id)
    }
  }

  const SortableTreeItem = ({ node, level }: { node: TreeNode; level: number }) => {
    const isExpanded = expandedNodes.has(node.id)
    const hasChildren = node.children && node.children.length > 0
    const isSelected = selectedNode?.id === node.id
    const canDrag = node.type === 'module' || node.type === 'subject' || node.type === 'lesson'
    const isDragOver = overId === node.id

    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging
    } = useSortable({ 
      id: node.id,
      disabled: !canDrag
    })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.3 : 1,
    }

    return (
      <div ref={setNodeRef} style={style}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`
            flex items-center gap-2 py-2 px-3 rounded-lg
            ${canDrag ? 'cursor-move' : 'cursor-pointer'}
            ${isDragging ? 'bg-navy-700/50 scale-105' : 'hover:bg-navy-800/50'}
            ${isDragOver && canDrag ? 'bg-gold-500/10 border-l-4 border-gold-500' : ''}
            ${isSelected ? 'bg-navy-800/70 ring-2 ring-gold-500/50' : ''}
            transition-all group relative
          `}
          style={{ paddingLeft: `${level * 24 + 12}px` }}
          onClick={() => {
            if (!isDragging) {
              setSelectedNode(node)
              if (hasChildren) toggleNode(node.id)
            }
          }}
        >
          {canDrag && (
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab hover:text-gold-300 text-gold-500/50 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="w-4 h-4" />
            </div>
          )}

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
          
          {!hasChildren && !canDrag && <div className="w-5" />}
          
          {getNodeIcon(node.type, isExpanded)}
          
          <span className="flex-1 text-gold-200">{node.title}</span>
          
          {node.order !== undefined && (
            <span className="text-xs text-gold-500/50 px-2 py-0.5 bg-navy-900/50 rounded">
              #{node.order}
            </span>
          )}
          
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
  }

  const renderTree = (nodes: TreeNode[], level = 0) => {
    // Group nodes by type to create separate sortable contexts
    const sortableIds = nodes
      .filter(n => n.type === 'module' || n.type === 'subject' || n.type === 'lesson')
      .map(n => n.id)
    
    if (sortableIds.length > 0) {
      return (
        <SortableContext
          items={sortableIds}
          strategy={verticalListSortingStrategy}
        >
          {nodes.map(node => (
            <SortableTreeItem key={node.id} node={node} level={level} />
          ))}
        </SortableContext>
      )
    }

    // For non-sortable items
    return nodes.map(node => (
      <SortableTreeItem key={node.id} node={node} level={level} />
    ))
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
        <Loader2 className="w-8 h-8 animate-spin text-gold-500" />
      </div>
    )
  }

  const activeNode = activeId ? findNodeById(treeData, activeId) : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gold flex items-center gap-2">
            <Layers className="w-8 h-8" />
            Estrutura Hierárquica
          </h1>
          <p className="text-gold-300 mt-1">
            Organize a estrutura: Curso → Módulos → Disciplinas → Aulas/Testes
          </p>
        </div>
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
              <li>• <span className="text-gold-300">Arraste e solte</span> módulos, disciplinas e aulas para reorganizar</li>
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

      {/* Tree View */}
      <Card className="min-h-[500px] relative">
        {isSaving && (
          <div className="absolute inset-0 bg-navy-900/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-xl">
            <div className="bg-navy-800 px-6 py-4 rounded-lg border border-gold-500/20 flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-gold-400" />
              <p className="text-gold-300">Salvando alterações...</p>
            </div>
          </div>
        )}
        
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
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
          
          <DragOverlay>
            {activeNode ? (
              <div className="bg-navy-800 border border-gold-500/30 rounded-lg px-4 py-2 shadow-2xl flex items-center gap-2">
                {getNodeIcon(activeNode.type)}
                <span className="text-gold-200 font-medium">{activeNode.title}</span>
                <span className={`
                  px-2 py-0.5 rounded-full text-xs font-medium border
                  ${getTypeColor(activeNode.type)}
                `}>
                  {activeNode.type === 'module' ? 'Módulo' :
                   activeNode.type === 'subject' ? 'Disciplina' :
                   activeNode.type === 'lesson' ? 'Aula' : activeNode.type}
                </span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </Card>

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
                </div>
              ) : (
                <div className="space-y-2">
                  {availableItems.map(item => (
                    <label
                      key={item.id}
                      className="flex items-center gap-3 p-3 bg-navy-900/50 rounded-lg hover:bg-navy-900/70 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItems([...selectedItems, item.id])
                          } else {
                            setSelectedItems(selectedItems.filter(id => id !== item.id))
                          }
                        }}
                        className="w-4 h-4 bg-navy-900/50 border-navy-600 rounded text-gold-500 focus:ring-gold-500"
                      />
                      <div className="flex-1">
                        <p className="text-gold-200 font-medium">
                          {item.title || item.name}
                        </p>
                        {item.description && (
                          <p className="text-gold-400 text-sm">{item.description}</p>
                        )}
                      </div>
                      {selectedItems.includes(item.id) && (
                        <Check className="w-5 h-5 text-green-400" />
                      )}
                    </label>
                  ))}
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
                  {associating ? 'Associando...' : 'Associar'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}