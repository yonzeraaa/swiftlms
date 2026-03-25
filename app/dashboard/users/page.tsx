'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Search, Mail, Key, X, Check, Trash2, Phone, GraduationCap, CircleUserRound, Compass, CircleX } from 'lucide-react'
import { useTranslation } from '../../contexts/LanguageContext'
import { useToast } from '../../components/Toast'
import Spinner from '../../components/ui/Spinner'
import { ClassicRule, CornerBracket } from '../../components/ui/RenaissanceSvgs'
import {
  getAllUsers,
  getAllCourses,
  getCourseModules,
  createNewUser,
  updateUserStatus as updateUserStatusAction,
  updateUserProfile,
  logActivity,
  type EnrichedProfile
} from '@/lib/actions/users-management'
import { useAuth } from '../../providers/AuthProvider'

type Profile = EnrichedProfile

type CourseBasic = {
  id: string
  title: string
  category: string | null
}

type CourseModuleBasic = {
  id: string
  title: string
  is_required: boolean | null
  order_index: number
  total_hours: number | null
}

interface NewUserForm {
  email: string
  password: string
  full_name: string
  phone: string
  role: 'student' | 'instructor' | 'admin'
}

interface EditUserForm {
  full_name: string
  phone: string
  role: 'student' | 'instructor' | 'admin'
}

const INK = '#1e130c'
const ACCENT = '#8b6d22'
const MUTED = '#7a6350'
const PARCH = '#faf6ee'
const BORDER = 'rgba(30,19,12,0.14)'

const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, '').slice(0, 11)
  if (numbers.length <= 2) return numbers
  if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
  if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`
}

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewUserModal, setShowNewUserModal] = useState(false)
  const [filterRole, setFilterRole] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const { t } = useTranslation()
  const { showToast } = useToast()
  const { session, isLoading: authLoading, refreshSession } = useAuth()

  const [newUserForm, setNewUserForm] = useState<NewUserForm>({ email: '', password: '', full_name: '', phone: '', role: 'student' })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [dropdownPosition, setDropdownPosition] = useState<{ top?: number; bottom?: number; right: number } | null>(null)
  const [dropdownUser, setDropdownUser] = useState<Profile | null>(null)
  
  const [showEditModal, setShowEditModal] = useState(false)
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [editForm, setEditForm] = useState<EditUserForm>({ full_name: '', phone: '', role: 'student' })
  const [newPassword, setNewPassword] = useState('')
  const [updating, setUpdating] = useState(false)
  
  const [showEnrollModal, setShowEnrollModal] = useState(false)
  const [courses, setCourses] = useState<CourseBasic[]>([])
  const [loadingCourses, setLoadingCourses] = useState(false)
  const [modulesByCourse, setModulesByCourse] = useState<Record<string, CourseModuleBasic[]>>({})
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [requiredModuleIds, setRequiredModuleIds] = useState<string[]>([])
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([])
  const [loadingModules, setLoadingModules] = useState(false)
  const [enrollingStudent, setEnrollingStudent] = useState(false)
  const [enrollError, setEnrollError] = useState<string | null>(null)
  
  const [showDummyModal, setShowDummyModal] = useState(false)
  const [dummyLoading, setDummyLoading] = useState(false)
  const [dummyResult, setDummyResult] = useState<{ email: string; password: string; userId?: string; stats?: Record<string, number> } | null>(null)

  const fetchUsers = useCallback(async () => {
    try {
      const enrichedUsers = await getAllUsers()
      setUsers(enrichedUsers)
    } catch (error) {
      console.error(error)
      showToast('Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const loadCourses = async () => {
    if (loadingCourses || courses.length > 0) return
    try {
      setLoadingCourses(true)
      const result = await getAllCourses()
      if (result.success) setCourses(result.courses || [])
    } catch (err) {
      setEnrollError('Erro ao carregar cursos.')
    } finally {
      setLoadingCourses(false)
    }
  }

  const loadModulesForCourse = async (courseId: string) => {
    if (!courseId) return
    const cached = modulesByCourse[courseId]
    if (cached) {
      const req = cached.filter(m => m.is_required !== false).map(m => m.id)
      setRequiredModuleIds(req)
      setSelectedModuleIds(cached.map(m => m.id))
      return
    }
    try {
      setLoadingModules(true)
      const result = await getCourseModules(courseId)
      if (result.success) {
        const modules = result.modules || []
        setModulesByCourse(prev => ({ ...prev, [courseId]: modules }))
        const req = modules.filter(m => m.is_required !== false).map(m => m.id)
        setRequiredModuleIds(req)
        setSelectedModuleIds(modules.map(m => m.id))
      }
    } catch (err) {
      setEnrollError('Erro ao carregar módulos.')
    } finally {
      setLoadingModules(false)
    }
  }

  const handleEnrollStudent = async () => {
    if (!selectedUser || !selectedCourseId) return
    setEnrollingStudent(true); setEnrollError(null);
    try {
      const optionalSelections = selectedModuleIds.filter(id => !requiredModuleIds.includes(id))
      const res = await fetch('/api/courses/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ courseId: selectedCourseId, students: [{ studentId: selectedUser.id, moduleIds: optionalSelections }] })
      })
      if (!res.ok) throw new Error('Erro ao matricular')
      showToast('Matrícula realizada com sucesso!'); setShowEnrollModal(false); fetchUsers();
    } catch (err: any) {
      setEnrollError(err.message)
    } finally {
      setEnrollingStudent(false)
    }
  }

  const createUser = async () => {
    setCreating(true); setError(null);
    try {
      const result = await createNewUser(newUserForm)
      if (!result.success) throw new Error(result.error)
      setShowNewUserModal(false); setNewUserForm({ email: '', password: '', full_name: '', phone: '', role: 'student' }); fetchUsers();
    } catch (err: any) { setError(err.message) } finally { setCreating(false) }
  }

  const updateUserStatus = async (userId: string, status: 'active' | 'frozen') => {
    try {
      const result = await updateUserStatusAction(userId, status)
      if (result.success) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, status } : u))
        showToast(status === 'active' ? 'Usuário ativado' : 'Usuário inativado')
      }
    } catch (err) { console.error(err) } finally { setOpenDropdown(null) }
  }

  const updateUser = async () => {
    if (!selectedUser) return
    setUpdating(true); setError(null);
    try {
      const result = await updateUserProfile(selectedUser.id, editForm)
      if (!result.success) throw new Error(result.error)
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, ...editForm } : u))
      setShowEditModal(false); setSelectedUser(null);
    } catch (err: any) { setError(err.message) } finally { setUpdating(false) }
  }

  const deleteUser = async () => {
    if (!selectedUser) return
    setUpdating(true); setError(null);
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao deletar')
      setUsers(prev => prev.filter(u => u.id !== selectedUser.id))
      setShowDeleteModal(false); setSelectedUser(null);
      await logActivity({ action: 'user_deleted', entity_type: 'user', entity_id: selectedUser.id, entity_name: selectedUser.full_name || selectedUser.email })
    } catch (err: any) { setError(err.message) } finally { setUpdating(false) }
  }

  const handleCreateDummy = async () => {
    setDummyLoading(true); setError(null);
    try {
      const res = await fetch('/api/admin/dummy-student', { method: 'POST', credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDummyResult(data); showToast('Aluno dummy criado!'); fetchUsers();
    } catch (err: any) { setError(err.message) } finally { setDummyLoading(false) }
  }

  const getRoleLabel = (role: string | null) => {
    switch(role) {
      case 'admin': return 'Administrador'
      case 'instructor': case 'teacher': return 'Professor'
      case 'student': return 'Aluno'
      default: return role || 'Sem Função'
    }
  }

  const openEditModal = (user: Profile) => {
    setSelectedUser(user)
    setEditForm({ full_name: user.full_name || '', phone: user.phone || '', role: normalizeRole(user.role) })
    setShowEditModal(true); setOpenDropdown(null);
  }

  const normalizeRole = (role: Profile['role']): EditUserForm['role'] => {
    if (role === 'admin') return 'admin'
    if (role === 'instructor' || role === 'teacher') return 'instructor'
    return 'student'
  }

  const openEnrollStudentModal = (user: Profile) => {
    setSelectedUser(user)
    setShowEnrollModal(true)
    setEnrollError(null)
    setSelectedCourseId('')
    setSelectedModuleIds([])
    setRequiredModuleIds([])
    setOpenDropdown(null)
    void loadCourses()
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser || !newPassword) return
    setUpdating(true)
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id, newPassword })
      })
      if (!res.ok) throw new Error('Erro ao resetar senha')
      showToast('Senha alterada com sucesso!')
      setShowResetPasswordModal(false)
      setNewPassword('')
    } catch (err: any) {
      showToast(err.message)
    } finally {
      setUpdating(false)
    }
  }

  const filteredUsers = users.filter(user => {
    const mSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const mRole = filterRole === 'all' || (filterRole === 'instructor' ? user.role === 'instructor' || user.role === 'teacher' : user.role === filterRole)
    const mStatus = filterStatus === 'all' || (filterStatus === 'active' ? user.status !== 'frozen' : user.status === 'frozen')
    return mSearch && mRole && mStatus
  })

  return (
    <div className="flex flex-col w-full">
      {/* ── Cabeçalho Principal ── */}
      <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 w-full border-b border-[#1e130c]/10 pb-8">
        <div className="flex-1">
          <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', fontWeight: 700, color: INK, lineHeight: 1 }}>
            Gestão de Pessoas
          </h1>
          <p style={{ fontFamily: 'var(--font-lora)', fontSize: '1.1rem', fontStyle: 'italic', color: MUTED, marginTop: '0.5rem' }}>
            Livro de registros de alunos, docentes e administradores
          </p>
          <div className="mt-6 w-full max-w-md">
            <ClassicRule color={INK} />
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => setShowDummyModal(true)}
            style={{ padding: '1rem 2rem', backgroundColor: 'transparent', border: `1px solid ${INK}`, color: INK, cursor: 'pointer', fontFamily: 'var(--font-lora)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}
          >
            Gerar Aluno
          </button>
          <button
            onClick={() => setShowNewUserModal(true)}
            style={{ padding: '1rem 3rem', backgroundColor: INK, color: PARCH, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-lora)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          >
            Novo Registro
          </button>
        </div>
      </div>

      {/* ── Filtros e Métricas ── */}
      <div className="flex flex-col lg:flex-row gap-8 mb-12 items-stretch">
        <div className="flex-1 flex flex-col md:flex-row gap-4">
          <div className="flex-[2] relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7a6350]" />
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, color: INK, fontFamily: 'var(--font-lora)', fontSize: '1rem' }}
            />
          </div>
          <div className="flex-1 relative">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              style={{ width: '100%', padding: '1rem', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, color: INK, fontFamily: 'var(--font-lora)', cursor: 'pointer', appearance: 'none' }}
            >
              <option value="all">Todas as Funções</option>
              <option value="student">Alunos</option>
              <option value="instructor">Professores</option>
              <option value="admin">Administradores</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50 text-xs">▼</div>
          </div>
          <div className="flex-1 relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ width: '100%', padding: '1rem', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, color: INK, fontFamily: 'var(--font-lora)', cursor: 'pointer', appearance: 'none' }}
            >
              <option value="all">Todos os Status</option>
              <option value="active">Ativos</option>
              <option value="frozen">Inativos</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50 text-xs">▼</div>
          </div>
        </div>
        
        <div className="w-full lg:w-64 border border-[#1e130c]/10 bg-[#1e130c]/[0.02] flex items-center px-6 py-4 justify-between">
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Registros</span>
          <span style={{ fontFamily: 'var(--font-playfair)', fontSize: '2rem', fontWeight: 700, color: INK, lineHeight: 1 }}>{users.length}</span>
        </div>
      </div>

      {/* ── Tabela de Registros ── */}
      {loading ? (
        <Spinner fullPage size="xl" />
      ) : (
        <div className="w-full overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse min-w-[900px]">
            <thead>
              <tr style={{ borderBottom: `2px solid ${INK}` }}>
                <th className="px-4 py-4 text-left" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: MUTED }}>Nome e Identificação</th>
                <th className="px-4 py-4 text-left w-48" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: MUTED }}>Função</th>
                <th className="px-4 py-4 text-left w-40" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: MUTED }}>Situação</th>
                <th className="px-4 py-4 text-left w-48" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: MUTED }}>Data de Registro</th>
                <th className="px-4 py-4 text-right w-20" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: MUTED }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id} style={{ borderBottom: `1px dashed ${BORDER}` }} className="hover:bg-[#1e130c]/[0.02] transition-colors group">
                  <td className="px-4 py-6 align-top">
                    <div>
                      <span style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.25rem', fontWeight: 600, color: INK, display: 'block', marginBottom: '0.25rem' }}>{u.full_name || 'Sem Nome'}</span>
                      <div className="flex items-center gap-3 text-sm italic text-[#7a6350]">
                        <Mail size={12} className="opacity-50" /> {u.email}
                        {u.phone && <><span className="opacity-30">•</span> <Phone size={12} className="opacity-50" /> {u.phone}</>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-6 align-top">
                    <span className="text-xs tracking-[0.1em] uppercase border border-[#1e130c]/20 px-3 py-1 text-[#7a6350] font-medium inline-block mt-1">
                      {getRoleLabel(u.role)}
                    </span>
                  </td>
                  <td className="px-4 py-6 align-top">
                    <span style={{ 
                      display: 'inline-block',
                      marginTop: '0.25rem',
                      fontSize: '0.65rem', 
                      fontWeight: 700, 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.05em',
                      color: u.status === 'frozen' ? MUTED : INK,
                      backgroundColor: u.status === 'frozen' ? 'transparent' : 'rgba(30,19,12,0.05)',
                      padding: '0.35rem 0.75rem',
                      border: `1px solid ${u.status === 'frozen' ? MUTED : INK}`
                    }}>
                      {u.status === 'frozen' ? 'Inativo' : 'Ativo'}
                    </span>
                  </td>
                  <td className="px-4 py-6 align-top" style={{ fontFamily: 'var(--font-lora)', fontSize: '0.95rem', color: MUTED, paddingTop: '1.75rem' }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="px-4 py-6 text-right align-top">
                    <button
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        const menuHeight = 260
                        const right = window.innerWidth - rect.right
                        const spaceBelow = window.innerHeight - rect.bottom
                        if (spaceBelow < menuHeight) {
                          setDropdownPosition({ bottom: window.innerHeight - rect.top + 8, right })
                        } else {
                          setDropdownPosition({ top: rect.bottom + 8, right })
                        }
                        setDropdownUser(u)
                        setOpenDropdown(u.id)
                      }}
                      className="px-2 py-1 rounded border border-[#8b6d22]/30 hover:border-[#8b6d22]/70 hover:bg-[#8b6d22]/[0.05] text-[#8b6d22] text-[0.9rem] leading-none font-[family-name:var(--font-lora)] transition-colors duration-150"
                      style={{ letterSpacing: '0.1em' }}
                    >
                      ···
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filteredUsers.length === 0 && (
            <div className="py-24 text-center italic text-[#7a6350] border border-dashed border-[#1e130c]/10 mt-4 w-full">Nenhum registro encontrado para os filtros informados.</div>
          )}
        </div>
      )}

      {/* ── Menu de Ações (Dropdown) ── */}
      {openDropdown && dropdownUser && dropdownPosition && (
        <>
          <div className="fixed inset-0 z-[11000] bg-transparent" onClick={() => { setOpenDropdown(null); setDropdownUser(null); }} />
          <div
            className="fixed w-60 bg-[#faf6ee] border border-[#1e130c]/20 shadow-2xl z-[11001] py-3 font-[family-name:var(--font-lora)] animate-in fade-in zoom-in-95 duration-200"
            style={{
              ...(dropdownPosition.top !== undefined
                ? { top: `${dropdownPosition.top}px` }
                : { bottom: `${dropdownPosition.bottom}px` }),
              right: `${dropdownPosition.right}px`,
            }}
          >
            {/* Seta direcional */}
            {dropdownPosition.top !== undefined ? (
              <div className="absolute -top-2 right-4 w-4 h-4 bg-[#faf6ee] border-l border-t border-[#1e130c]/20 rotate-45" />
            ) : (
              <div className="absolute -bottom-2 right-4 w-4 h-4 bg-[#faf6ee] border-r border-b border-[#1e130c]/20 rotate-45" />
            )}

            <button
              onClick={() => openEditModal(dropdownUser)}
              className="w-full px-5 py-3 text-left hover:bg-[#1e130c]/5 flex items-center justify-start gap-4 transition-colors"
            >
              <CircleUserRound size={16} style={{ color: ACCENT }} />
              <span style={{ fontSize: '0.95rem', color: INK, fontWeight: 500 }}>Editar Dados</span>
            </button>

            {dropdownUser.role === 'student' && (
              <button
                onClick={() => openEnrollStudentModal(dropdownUser)}
                className="w-full px-5 py-3 text-left hover:bg-[#1e130c]/5 flex items-center justify-start gap-4 transition-colors"
              >
                <Compass size={16} style={{ color: ACCENT }} />
                <span style={{ fontSize: '0.95rem', color: INK, fontWeight: 500 }}>Matricular Aluno</span>
              </button>
            )}

            {dropdownUser.role === 'student' && (
              <Link
                href={`/dashboard/users/${dropdownUser.id}/grades`}
                onClick={() => setOpenDropdown(null)}
                className="w-full px-5 py-3 text-left hover:bg-[#1e130c]/5 flex items-center justify-start gap-4 transition-colors no-underline"
              >
                <GraduationCap size={16} style={{ color: ACCENT }} />
                <span style={{ fontSize: '0.95rem', color: INK, fontWeight: 500 }}>Histórico de Notas</span>
              </Link>
            )}

            <button
              onClick={() => { setSelectedUser(dropdownUser); setShowResetPasswordModal(true); setOpenDropdown(null); }}
              className="w-full px-5 py-3 text-left hover:bg-[#1e130c]/5 flex items-center justify-start gap-4 transition-colors"
            >
              <Key size={16} style={{ color: ACCENT }} />
              <span style={{ fontSize: '0.95rem', color: INK, fontWeight: 500 }}>Redefinir Senha</span>
            </button>

            {dropdownUser.status === 'frozen' ? (
              <button
                onClick={() => updateUserStatus(dropdownUser.id, 'active')}
                className="w-full px-5 py-3 text-left hover:bg-[#1e130c]/5 flex items-center justify-start gap-4 transition-colors"
              >
                <Check size={16} style={{ color: '#2d6a4f' }} />
                <span style={{ fontSize: '0.95rem', color: INK, fontWeight: 500 }}>Ativar Registro</span>
              </button>
            ) : (
              <button
                onClick={() => updateUserStatus(dropdownUser.id, 'frozen')}
                className="w-full px-5 py-3 text-left hover:bg-[#1e130c]/5 flex items-center justify-start gap-4 transition-colors"
              >
                <CircleX size={16} style={{ color: MUTED }} />
                <span style={{ fontSize: '0.95rem', color: MUTED, fontWeight: 500, fontStyle: 'italic' }}>Congelar Conta</span>
              </button>
            )}

            <div className="border-t border-[#1e130c]/10 mt-3 pt-3">
              <button
                onClick={() => { setSelectedUser(dropdownUser); setShowDeleteModal(true); setOpenDropdown(null); }}
                className="w-full px-5 py-3 text-left hover:bg-[#7a6350]/10 flex items-center justify-start gap-4 transition-colors"
              >
                <Trash2 size={16} className="text-[#7a6350] italic" />
                <span style={{ fontSize: '0.95rem', color: '#7a6350', fontWeight: 600 }}>Excluir Registro</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Modais ── */}
      
      {(showNewUserModal || (showEditModal && selectedUser)) && (
        <div className="fixed inset-0 bg-[#1e130c]/70 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
          <div className="bg-[#faf6ee] w-full max-w-2xl relative border border-[#1e130c]/20 shadow-2xl p-10 md:p-16 max-h-[90vh] overflow-y-auto custom-scrollbar font-[family-name:var(--font-lora)] text-left">
            <div className="absolute top-4 left-4 w-10 h-10 text-[#1e130c]/5"><CornerBracket size={40} /></div>
            <div className="absolute top-4 right-4 w-10 h-10 text-[#1e130c]/5 rotate-90"><CornerBracket size={40} /></div>
            
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-[#1e130c]/10">
              <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '2.5rem', color: INK, fontWeight: 700 }}>
                {showNewUserModal ? 'Novo Usuário' : 'Editar Usuário'}
              </h2>
              <button onClick={() => { setShowNewUserModal(false); setShowEditModal(false); }} className="text-[#1e130c]/40 hover:text-[#1e130c] transition-colors"><X size={32} /></button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); showNewUserModal ? createUser() : updateUser(); }} className="space-y-8">
              <div className="space-y-6">
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: MUTED, marginBottom: '0.5rem' }}>Nome Completo</label>
                  <input
                    type="text"
                    value={showNewUserModal ? newUserForm.full_name : editForm.full_name}
                    onChange={(e) => showNewUserModal ? setNewUserForm({...newUserForm, full_name: e.target.value}) : setEditForm({...editForm, full_name: e.target.value})}
                    style={{ width: '100%', padding: '0.85rem', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, color: INK, fontFamily: 'var(--font-lora)', fontSize: '1rem' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: MUTED, marginBottom: '0.5rem' }}>E-mail de Acesso</label>
                  <input
                    type="email"
                    value={showNewUserModal ? newUserForm.email : selectedUser?.email}
                    disabled={!showNewUserModal}
                    onChange={(e) => showNewUserModal && setNewUserForm({...newUserForm, email: e.target.value})}
                    style={{ width: '100%', padding: '0.85rem', backgroundColor: showNewUserModal ? 'transparent' : 'rgba(30,19,12,0.03)', border: `1px solid ${BORDER}`, color: showNewUserModal ? INK : MUTED, fontFamily: 'var(--font-lora)', fontSize: '1rem' }}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: MUTED, marginBottom: '0.5rem' }}>Telefone</label>
                    <input
                      type="tel"
                      value={showNewUserModal ? newUserForm.phone : editForm.phone}
                      onChange={(e) => {
                        const val = formatPhone(e.target.value);
                        showNewUserModal ? setNewUserForm({...newUserForm, phone: val}) : setEditForm({...editForm, phone: val})
                      }}
                      style={{ width: '100%', padding: '0.85rem', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, color: INK, fontFamily: 'var(--font-lora)', fontSize: '1rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: MUTED, marginBottom: '0.5rem' }}>Função</label>
                    <select
                      value={showNewUserModal ? newUserForm.role : editForm.role}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        showNewUserModal ? setNewUserForm({...newUserForm, role: val}) : setEditForm({...editForm, role: val})
                      }}
                      style={{ width: '100%', padding: '0.85rem', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, color: INK, fontFamily: 'var(--font-lora)', fontSize: '1rem', cursor: 'pointer' }}
                    >
                      <option value="student">Aluno</option>
                      <option value="instructor">Professor</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                </div>

                {showNewUserModal && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: MUTED, marginBottom: '0.5rem' }}>Senha Inicial</label>
                    <input
                      type="password"
                      value={newUserForm.password}
                      onChange={(e) => setNewUserForm({...newUserForm, password: e.target.value})}
                      style={{ width: '100%', padding: '0.85rem', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, color: INK, fontFamily: 'var(--font-lora)', fontSize: '1rem' }}
                      required minLength={6}
                    />
                  </div>
                )}
              </div>

              {error && <p style={{ color: MUTED, fontStyle: 'italic', fontSize: '0.875rem' }}>{error}</p>}

              <div className="flex justify-end gap-6 pt-10 border-t border-[#1e130c]/10">
                <button type="button" onClick={() => { setShowNewUserModal(false); setShowEditModal(false); }} style={{ padding: '0.85rem 2rem', background: 'none', border: `1px solid ${INK}`, color: INK, cursor: 'pointer', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.85rem' }}>Cancelar</button>
                <button type="submit" disabled={creating || updating} style={{ padding: '0.85rem 3rem', backgroundColor: INK, color: PARCH, border: 'none', cursor: 'pointer', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: '0.85rem' }}>
                  {creating || updating ? 'Salvando...' : 'Salvar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Matrícula em Curso Padronizada */}
      {showEnrollModal && selectedUser && (
        <div className="fixed inset-0 bg-[#1e130c]/70 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
          <div className="bg-[#faf6ee] w-full max-w-2xl relative border border-[#1e130c]/20 shadow-2xl p-10 md:p-16 max-h-[90vh] overflow-y-auto custom-scrollbar font-[family-name:var(--font-lora)] text-left">
            <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '2.5rem', color: INK, marginBottom: '2rem', fontWeight: 700 }} className="pb-4 border-b border-[#1e130c]/10">Matricular Aluno</h2>
            
            <div className="mb-8 p-6 bg-[#1e130c]/[0.02] border border-[#1e130c]/5">
              <p className="font-bold text-xl" style={{ color: INK }}>{selectedUser.full_name}</p>
              <p style={{ color: MUTED, fontStyle: 'italic' }}>{selectedUser.email}</p>
            </div>

            <div className="space-y-10">
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: MUTED, marginBottom: '0.5rem' }}>Selecionar Curso</label>
                <select
                  value={selectedCourseId}
                  onChange={async (e) => {
                    const id = e.target.value; setSelectedCourseId(id);
                    if (id) { void loadModulesForCourse(id); }
                  }}
                  onClick={() => loadCourses()}
                  style={{ width: '100%', padding: '1rem', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, color: INK, fontSize: '1.1rem', cursor: 'pointer' }}
                >
                  <option value="">Escolha um curso...</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>

              {selectedCourseId && (
                <div className="space-y-4">
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: MUTED, marginBottom: '0.5rem' }}>Módulos de Estudo</label>
                  <div className="space-y-4">
                    {modulesByCourse[selectedCourseId]?.map(m => (
                      <div key={m.id} className="flex items-center gap-5 p-5 border border-[#1e130c]/5 bg-white/20 transition-colors hover:bg-white/40">
                        <input
                          type="checkbox"
                          checked={selectedModuleIds.includes(m.id)}
                          disabled={m.is_required !== false}
                          onChange={() => {
                            setSelectedModuleIds(prev => prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id])
                          }}
                          className="w-6 h-6 accent-[#1e130c] cursor-pointer"
                        />
                        <div className="flex-1">
                          <p className="font-bold text-lg" style={{ color: INK }}>{m.title}</p>
                          <p className="text-xs uppercase tracking-wider font-bold" style={{ color: MUTED }}>{m.is_required !== false ? 'Obrigatório' : 'Opcional'} • {m.total_hours}h</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {enrollError && <p className="mt-8 italic" style={{ color: MUTED }}>{enrollError}</p>}

            <div className="flex justify-end gap-6 pt-10 mt-10 border-t border-[#1e130c]/10">
              <button onClick={() => setShowEnrollModal(false)} style={{ padding: '0.85rem 2rem', background: 'none', border: `1px solid ${INK}`, color: INK, cursor: 'pointer', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.85rem' }}>Cancelar</button>
              <button onClick={handleEnrollStudent} disabled={enrollingStudent || !selectedCourseId} style={{ padding: '0.85rem 3rem', backgroundColor: INK, color: PARCH, border: 'none', cursor: 'pointer', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: '0.85rem' }}>
                {enrollingStudent ? 'Matriculando...' : 'Confirmar Matrícula'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alterar Senha Padronizada */}
      {showResetPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-[#1e130c]/70 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
          <div className="bg-[#faf6ee] w-full max-w-md relative border border-[#1e130c]/20 shadow-2xl p-10 md:p-12 font-[family-name:var(--font-lora)] text-left">
            <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '2rem', color: INK, marginBottom: '1.5rem', fontWeight: 700 }} className="pb-3 border-b border-[#1e130c]/10">Alterar Senha</h2>
            
            <div className="mb-10 p-6 bg-[#1e130c]/[0.02] border border-[#1e130c]/5">
              <p className="font-bold text-lg" style={{ color: INK }}>{selectedUser.full_name}</p>
              <p style={{ color: MUTED, fontSize: '0.9rem' }}>{selectedUser.email}</p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-8">
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: MUTED, marginBottom: '0.5rem' }}>Nova Senha de Acesso</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ width: '100%', padding: '1rem', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, color: INK, fontSize: '1.1rem', textAlign: 'center' }}
                  required
                  minLength={6}
                  placeholder="••••••"
                />
              </div>

              <div className="flex flex-col gap-4 pt-6">
                <button type="submit" disabled={updating} style={{ padding: '1.25rem', backgroundColor: INK, color: PARCH, border: 'none', cursor: 'pointer', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                  {updating ? 'Gravando...' : 'Salvar Nova Senha'}
                </button>
                <button type="button" onClick={() => setShowResetPasswordModal(false)} style={{ padding: '0.5rem', background: 'none', border: 'none', color: MUTED, textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Desistir</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excluir Usuário Padronizado */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-[#1e130c]/80 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
          <div className="bg-[#faf6ee] w-full max-w-md relative border border-[#1e130c]/30 shadow-2xl p-12 text-left font-[family-name:var(--font-lora)]">
            <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '2rem', color: INK, marginBottom: '1.5rem', fontWeight: 700 }} className="pb-3 border-b border-[#1e130c]/10">Excluir Usuário</h2>
            <p style={{ color: INK, fontSize: '1.1rem', lineHeight: 1.6, marginBottom: '3rem' }}>Deseja remover permanentemente o usuário <strong style={{ color: ACCENT }}>{selectedUser.full_name || selectedUser.email}</strong> do sistema?</p>
            <div className="flex gap-6">
              <button onClick={() => setShowDeleteModal(false)} style={{ flex: 1, padding: '1rem', background: 'none', border: `1px solid ${INK}`, color: INK, cursor: 'pointer', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.8rem' }}>Cancelar</button>
              <button onClick={deleteUser} style={{ flex: 1, padding: '1rem', backgroundColor: INK, color: PARCH, border: 'none', cursor: 'pointer', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.8rem' }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
