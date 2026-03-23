'use client'

import { useState, useEffect } from 'react'
import {
  BookOpen,
  ChevronRight,
  ChevronDown,
  Edit,
  Trash2,
  GraduationCap,
  FileText,
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
import { ClassicRule } from '../../components/ui/RenaissanceSvgs'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/Button'
import { motion, AnimatePresence } from 'framer-motion'
import CourseStructureManager from '../../components/CourseStructureManager'
import {
  getHierarchicalData,
  getAvailableItemsForAssociation,
  saveAssociations,
  removeNodeFromStructure
} from '@/lib/actions/admin-structure'

interface TreeNode {
  id: string
  type: 'course' | 'module' | 'subject' | 'lesson' | 'test'
  title: string
  children?: TreeNode[]
  data?: any
  parentId?: string
  order?: number
}

interface AssociationOption {
  id: string
  displayName: string
  description?: string | null
  availability: 'available' | 'current' | 'assignedElsewhere'
  statusText: string
  statusColorClass: string
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
  const [associationOptions, setAssociationOptions] = useState<AssociationOption[]>([])
  const [showOnlyAvailableOptions, setShowOnlyAvailableOptions] = useState(true)

  useEffect(() => {
    fetchHierarchicalData()
  }, [])

  const fetchHierarchicalData = async () => {
    try {
      setLoading(true)
      const { tree, courses: fetchedCourses } = await getHierarchicalData()

      setTreeData(tree)
      setCourses(fetchedCourses)
      if (fetchedCourses && fetchedCourses.length > 0 && !selectedCourseId) {
        setSelectedCourseId(fetchedCourses[0].id)
      }
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

  const sortAssociationOptions = (options: AssociationOption[]) => {
    const priority = {
      available: 0,
      current: 1,
      assignedElsewhere: 2
    } as const

    return [...options].sort((a, b) => {
      const priorityDiff = priority[a.availability] - priority[b.availability]
      if (priorityDiff !== 0) return priorityDiff
      return a.displayName.toLocaleLowerCase('pt-BR').localeCompare(
        b.displayName.toLocaleLowerCase('pt-BR'),
        'pt-BR'
      )
    })
  }

  const updateAssociationAvailableItems = (
    options: AssociationOption[],
    onlyAvailable: boolean
  ) => {
    const filtered = onlyAvailable
      ? options.filter(option => option.availability === 'available')
      : options

    setAvailableItems(sortAssociationOptions(filtered))

    if (onlyAvailable) {
      setSelectedItems(prev => prev.filter(id => {
        const option = options.find(item => item.id === id)
        return option ? option.availability === 'available' : false
      }))
    }
  }

  const toggleAssociationFilterMode = () => {
    setShowOnlyAvailableOptions(prev => {
      const nextValue = !prev
      updateAssociationAvailableItems(associationOptions, nextValue)
      return nextValue
    })
  }

  const getNodeIcon = (type: string, expanded?: boolean) => {
    switch (type) {
      case 'course':
        return <BookOpen className="w-4 h-4 text-[#8b6d22]" />
      case 'module':
        return expanded ? <FolderOpen className="w-4 h-4 text-blue-400" /> : <Folder className="w-4 h-4 text-blue-400" />
      case 'subject':
        return <GraduationCap className="w-4 h-4 text-[#1e130c] font-bold" />
      case 'lesson':
        return <FileText className="w-4 h-4 text-purple-400" />
      case 'test':
        return <ClipboardCheck className="w-4 h-4 text-[#7a6350] italic" />
      default:
        return <Layers className="w-4 h-4 text-[#7a6350]" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'course':
        return 'bg-[#8b6d22]/20 text-[#8b6d22] border-[#8b6d22]/30'
      case 'module':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'subject':
        return 'bg-[#1e130c]/5/20 text-[#1e130c] font-bold border-green-500/30'
      case 'lesson':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      case 'test':
        return 'bg-[#7a6350]/10/20 text-[#7a6350] italic border-red-500/30'
      default:
        return 'bg-[#8b6d22]/20 text-[#8b6d22] border-[#8b6d22]/30'
    }
  }

  const handleAssociate = async (parent: TreeNode, type: 'module' | 'subject' | 'lesson' | 'test') => {
    setParentNode(parent)
    setAssociateType(type)
    setSelectedItems([])
    setShowAssociateModal(true)
    setAssociationOptions([])
    setShowOnlyAvailableOptions(true)

    try {
      const { items, options } = await getAvailableItemsForAssociation(
        parent.id,
        parent.type,
        type
      )

      if (items.length > 0) {
        setAvailableItems(items)
      } else {
        setAssociationOptions(options)
        updateAssociationAvailableItems(options, true)
      }
    } catch (error) {
      console.error('Error loading available items:', error)
    }
  }

  const handleSaveAssociations = async () => {
    if (!parentNode || selectedItems.length === 0) return

    setAssociating(true)
    try {
      await saveAssociations(
        parentNode.id,
        parentNode.type,
        associateType,
        selectedItems
      )

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

    try {
      setLoading(true)
      await removeNodeFromStructure(node.type, node.id, node.parentId)
      await fetchHierarchicalData()
    } catch (error) {
      console.error('Error removing node:', error)
      alert('Erro ao remover item da estrutura')
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
              flex items-center gap-3 py-3 px-3 border-b border-dashed border-[#1e130c]/20 cursor-pointer font-[family-name:var(--font-lora)]
              hover:bg-[#8b6d22]/5 transition-all group
              ${isSelected ? 'bg-[#8b6d22]/10' : ''}
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
                className="p-0.5 hover:bg-[#1e130c]/5 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-[#8b6d22]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[#8b6d22]" />
                )}
              </button>
            )}
            
            {!hasChildren && <div className="w-5" />}
            
            {getNodeIcon(node.type, isExpanded)}
            
            <span className="flex-1 text-[#1e130c]">{node.title}</span>
            
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
                  className="p-1 hover:bg-[#1e130c]/5 rounded"
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
                  className="p-1 hover:bg-[#1e130c]/5 rounded"
                  title="Associar Disciplinas"
                >
                  <Link2 className="w-3 h-3 text-[#1e130c] font-bold" />
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
                    className="p-1 hover:bg-[#1e130c]/5 rounded"
                    title="Associar Aulas"
                  >
                    <Link2 className="w-3 h-3 text-purple-400" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAssociate(node, 'test')
                    }}
                    className="p-1 hover:bg-[#1e130c]/5 rounded"
                    title="Associar Testes"
                  >
                    <Link2 className="w-3 h-3 text-[#7a6350] italic" />
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
                  className="p-1 hover:bg-[#1e130c]/5 rounded"
                  title={node.type === 'module' ? 'Excluir Módulo' : 'Remover da Estrutura'}
                >
                  <Trash2 className="w-3 h-3 text-[#7a6350] italic" />
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

  return (
    <div className="max-w-[1400px] mx-auto p-6 md:p-10 space-y-8 bg-[#faf6ee] min-h-screen font-[family-name:var(--font-lora)] text-[#1e130c]">

      {/* Header Clássico */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div className="flex-1">
          <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 'clamp(2.5rem, 5vw, 4rem)', color: '#1e130c', lineHeight: 1.1, fontWeight: 700 }}>
            Estrutura Hierárquica
          </h1>
          <p style={{ fontFamily: 'var(--font-lora)', fontSize: '1.1rem', fontStyle: 'italic', color: '#7a6350', marginTop: '0.5rem' }}>
            Visão geral e ordenação: Curso → Módulos → Disciplinas → Aulas/Avaliações
          </p>
          <div className="mt-6 w-full max-w-md">
            <ClassicRule color="#1e130c" />
          </div>
        </div>
        <div className="flex gap-4 bg-[#faf6ee] p-1 border border-[#1e130c]/20 rounded-sm">
           <button onClick={() => setViewMode('tree')} className={`px-4 py-2 text-sm font-medium transition-colors \${viewMode === 'tree' ? 'bg-[#1e130c] text-[#faf6ee]' : 'text-[#1e130c] hover:bg-[#1e130c]/5'}`}>Em Árvore</button>
           <button onClick={() => setViewMode('manage')} className={`px-4 py-2 text-sm font-medium transition-colors \${viewMode === 'manage' ? 'bg-[#1e130c] text-[#faf6ee]' : 'text-[#1e130c] hover:bg-[#1e130c]/5'}`}>Gerenciar</button>
        </div>
      </div>

      {/* Filtros e Métricas Alinhados */}
      <div className="flex flex-col lg:flex-row gap-8 mb-12 items-stretch">
        <div className="flex-1 flex flex-col md:flex-row gap-4">
          <div className="flex-[2] relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7a6350]" />
            <input
              type="text"
              placeholder="Buscar nos registros da estrutura..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', backgroundColor: 'transparent', border: '1px solid rgba(30,19,12,0.14)', color: '#1e130c', fontFamily: 'var(--font-lora)', fontSize: '1rem' }}
            />
          </div>
        </div>
        
        <div className="w-full lg:w-64 border border-[#1e130c]/10 bg-[#1e130c]/[0.02] flex items-center px-6 py-4 justify-between">
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7a6350', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Itens Raiz</span>
          <span style={{ fontFamily: 'var(--font-playfair)', fontSize: '2rem', fontWeight: 700, color: '#1e130c', lineHeight: 1 }}>{treeData.length}</span>
        </div>
      </div>

      {/* Conditional Rendering based on View Mode */}
      {loading ? (
        <Spinner fullPage size="xl" />
      ) : viewMode === 'tree' ? (
        /* Tree View */
        <div className="min-h-[500px] border-t-2 border-b-2 border-[#1e130c]/10 py-6 font-[family-name:var(--font-lora)]">
          <div className="space-y-1">
            {displayTree.length > 0 ? (
              renderTree(displayTree)
            ) : (
              <div className="text-center py-16">
                <Layers className="w-12 h-12 text-[#8b6d22]/30 mx-auto mb-4" />
                <p className="text-[#7a6350] italic text-lg">
                  {searchTerm ? 'Nenhum registro encontrado nas páginas.' : 'O livro de registros de cursos encontra-se vazio.'}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Management View */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 border-t-2 border-[#1e130c]/10 pt-8">
          {/* Course Selector */}
          <div className="lg:col-span-1">
            <h3 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1e130c] mb-6 border-b border-[#1e130c]/20 pb-2">Selecione o Curso</h3>
            <div className="flex flex-col gap-2 font-[family-name:var(--font-lora)]">
              {courses.map((course: any) => (
                <button
                  key={course.id}
                  onClick={() => setSelectedCourseId(course.id)}
                  className={`w-full text-left py-3 px-4 transition-all border-b border-dashed border-[#1e130c]/20 last:border-0 ${
                    selectedCourseId === course.id
                      ? 'text-[#8b6d22] font-semibold bg-[#8b6d22]/5'
                      : 'text-[#7a6350] hover:text-[#1e130c] hover:bg-[#1e130c]/5'
                  }`}
                >
                  <span className="text-base">{course.title}</span>
                </button>
              ))}
            </div>
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
              <div className="text-center py-16 border border-[#1e130c]/10 bg-[#faf6ee]/30">
                <Layers className="w-12 h-12 text-[#8b6d22]/40 mx-auto mb-4" />
                <p className="text-[#7a6350]/70 font-[family-name:var(--font-lora)] italic">
                  Selecione um curso ao lado para organizar sua estrutura
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Associate Items Modal */}
      {showAssociateModal && (
        <div className="fixed inset-0 bg-[#1e130c]/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="relative w-full max-w-2xl bg-[#faf6ee] p-8 shadow-2xl border border-[#1e130c]/20 font-[family-name:var(--font-lora)]">

            <div className="flex justify-between items-center mb-6 border-b border-[#1e130c]/20 pb-4">
              <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1e130c] flex items-center gap-3">
                <Link2 className="w-6 h-6 text-[#8b6d22]" />
                {associateType === 'module' ? 'Gerenciar Módulos' :
                 `Associar ${associateType === 'subject' ? 'Disciplinas' : 
                           associateType === 'lesson' ? 'Aulas' : 'Testes'}`}
              </h2>
              <button
                onClick={() => setShowAssociateModal(false)}
                className="text-[#8b6d22] hover:text-[#1e130c] transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {associateType !== 'module' && associationOptions.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6 text-sm text-[#7a6350]">
                <p className="italic">
                  {showOnlyAvailableOptions
                    ? 'Exibindo apenas os registros disponíveis.'
                    : 'Exibindo todos os registros.'}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={toggleAssociationFilterMode}
                >
                  {showOnlyAvailableOptions ? 'Ver todos os registros' : 'Ver somente disponíveis'}
                </Button>
              </div>
            )}

            <div
              className="overflow-y-auto pr-2 custom-scrollbar"
              style={{ maxHeight: '50vh' }}
            >
              {availableItems.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-10 h-10 text-[#8b6d22]/40 mx-auto mb-4" />
                  <p className="text-[#7a6350] text-lg mb-2">
                    {associateType === 'module' ? 'Nenhum módulo lavrado para este curso' :
                     `Nenhuma ${associateType === 'subject' ? 'disciplina registrada' : 
                              associateType === 'lesson' ? 'aula registrada' : 'avaliação registrada'}`}
                  </p>
                  <p className="text-[#8b6d22]/80 text-sm italic">
                    {associateType === 'module' ? 
                     'Registre módulos na respectiva página para que constem aqui.' :
                     'Providencie novos registros antes de associá-los.'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {availableItems.map((item: any) => {
                    const isAssociationOption = typeof item.displayName === 'string' && 'availability' in item
                    const isDisabled = isAssociationOption && item.availability === 'current'
                    const wrapperClasses = `flex items-start gap-4 py-4 border-b border-dashed border-[#1e130c]/20 last:border-0 ${
                      isDisabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-[#8b6d22]/5 cursor-pointer transition-colors'
                    }`

                    const handleChange = (checked: boolean) => {
                      setSelectedItems(prev => {
                        if (checked) {
                          return prev.includes(item.id) ? prev : [...prev, item.id]
                        }
                        return prev.filter(id => id !== item.id)
                      })
                    }

                    const description = isAssociationOption ? item.description : item.description

                    return (
                      <label key={item.id} className={wrapperClasses}>
                        <div className="pt-1">
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.id)}
                            onChange={(e) => handleChange(e.target.checked)}
                            disabled={isDisabled}
                            className="w-5 h-5 bg-transparent border-2 border-[#8b6d22]/50 rounded-sm text-[#8b6d22] focus:ring-0 focus:ring-offset-0 disabled:opacity-50 transition-all checked:bg-[#8b6d22] checked:border-[#8b6d22]"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-[#1e130c] font-medium text-lg">
                            {isAssociationOption
                              ? item.displayName
                              : item.title}
                          </p>
                          {description && (
                            <p className="text-[#7a6350] text-sm mt-1 italic">
                              {description}
                            </p>
                          )}
                          {isAssociationOption && item.statusText && (
                            <p className={`text-xs mt-2 font-medium uppercase tracking-wider ${item.statusColorClass}`}>
                              {item.statusText}
                            </p>
                          )}
                        </div>
                        {selectedItems.includes(item.id) && !isDisabled && (
                          <Check className="w-6 h-6 text-[#8b6d22] flex-shrink-0 mt-1" />
                        )}
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-6 border-t border-[#1e130c]/20 mt-6">
              <p className="text-[#7a6350] font-medium">
                {selectedItems.length} {selectedItems.length === 1 ? 'item marcado' : 'itens marcados'}
              </p>
              <div className="flex gap-4">
                <Button
                  variant="secondary"
                  onClick={() => setShowAssociateModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveAssociations}
                  disabled={selectedItems.length === 0 || associating}
                >
                  {associating ? 'Averbar...' : 'Averbar Registro'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
