'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Filter, Plus, MoreVertical, Mail, UserPlus, Snowflake, Play, Edit, Key, X, Check, Trash2, AlertCircle, Phone, Users, Shield, GraduationCap, BookOpen, LayoutGrid, List, Lock, Unlock, FileText } from 'lucide-react'
import Card from '../../components/Card'
import Button from '../../components/Button'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/lib/database.types'
import { useTranslation } from '../../contexts/LanguageContext'
import UserCard from '../../components/UserCard'
import ViewToggle from '../../components/ViewToggle'
import { Chip } from '../../components/Badge'
import { SkeletonCard } from '../../components/Skeleton'
import { useToast } from '../../components/Toast'

type Profile = Tables<'profiles'> & {
  courses?: Array<{ id: string; title: string }>
  enrollments?: Array<{ id: string }>
  tests_created?: Array<{ id: string }>
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

// Função para formatar telefone
const formatPhone = (value: string) => {
  // Remove todos os caracteres não numéricos
  const numbers = value.replace(/\D/g, '')
  
  // Limita a 11 dígitos
  const truncated = numbers.slice(0, 11)
  
  // Aplica a formatação
  if (truncated.length <= 2) {
    return truncated
  } else if (truncated.length <= 7) {
    return `(${truncated.slice(0, 2)}) ${truncated.slice(2)}`
  } else if (truncated.length <= 10) {
    return `(${truncated.slice(0, 2)}) ${truncated.slice(2, 6)}-${truncated.slice(6)}`
  } else {
    return `(${truncated.slice(0, 2)}) ${truncated.slice(2, 7)}-${truncated.slice(7)}`
  }
}

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewUserModal, setShowNewUserModal] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [showFilters, setShowFilters] = useState(false)
  const [filterRole, setFilterRole] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [newUserForm, setNewUserForm] = useState<NewUserForm>({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role: 'student'
  })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [editForm, setEditForm] = useState<EditUserForm>({
    full_name: '',
    phone: '',
    role: 'student'
  })
  const [newPassword, setNewPassword] = useState('')
  const [updating, setUpdating] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // Load view preference from localStorage
    const savedViewMode = localStorage.getItem('usersViewMode')
    if (savedViewMode === 'grid' || savedViewMode === 'list') {
      setViewMode(savedViewMode)
    }
    
    fetchUsers()
  }, [])

  // Save view mode preference to localStorage
  useEffect(() => {
    localStorage.setItem('usersViewMode', viewMode)
  }, [viewMode])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown && !(event.target as Element).closest('.dropdown-menu')) {
        setOpenDropdown(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openDropdown])

  const fetchUsers = async () => {
    try {
      // For students, fetch enrollments and test attempts
      // For teachers, fetch courses and tests created
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Enrich data based on role
      const enrichedUsers = await Promise.all((profiles || []).map(async (user: any) => {
        if (user.role === 'student') {
          // Fetch enrollments and test attempts for students
          const { data: enrollments } = await supabase
            .from('enrollments')
            .select('id')
            .eq('user_id', user.id)

          return {
            ...user,
            enrollments: enrollments || []
          }
        } else if (user.role === 'instructor' || user.role === 'teacher') {
          // Fetch courses and tests created for teachers
          const { data: courses } = await supabase
            .from('courses')
            .select('id, title')
            .eq('instructor_id', user.id)

          const { data: tests } = await supabase
            .from('tests')
            .select('id')
            .eq('created_by', user.id)

          return {
            ...user,
            courses: courses || [],
            tests_created: tests || []
          }
        }
        return user
      }))

      setUsers(enrichedUsers)
    } catch (error) {
      console.error('Error fetching users:', error)
      showToast('Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }

  const createUser = async () => {
    setCreating(true)
    setError(null)

    try {
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUserForm.email,
        password: newUserForm.password,
        options: {
          data: {
            full_name: newUserForm.full_name,
            role: newUserForm.role
          }
        }
      })

      if (authError) throw authError

      // Update the profile with the correct role and phone
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            full_name: newUserForm.full_name,
            phone: newUserForm.phone,
            role: newUserForm.role 
          })
          .eq('id', authData.user.id)

        if (profileError) throw profileError
      }

      // Reset form and close modal
      setNewUserForm({
        email: '',
        password: '',
        full_name: '',
        phone: '',
        role: 'student'
      })
      setShowNewUserModal(false)
      
      // Refresh users list
      fetchUsers()
    } catch (error: any) {
      setError(error.message || t('users.error'))
    } finally {
      setCreating(false)
    }
  }

  const updateUserStatus = async (userId: string, status: 'active' | 'frozen') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status })
        .eq('id', userId)

      if (error) throw error
      
      // Update local state
      setUsers(users.map((user: any) => 
        user.id === userId ? { ...user, status } : user
      ))
      
      showToast(status === 'active' ? 'Usuário ativado' : 'Usuário desativado')
      setOpenDropdown(null)
    } catch (error) {
      console.error('Error updating user status:', error)
      showToast('Erro ao atualizar status')
    }
  }

  const openEditModal = (user: Profile) => {
    setSelectedUser(user)
    setEditForm({
      full_name: user.full_name || '',
      phone: user.phone || '',
      role: user.role as any || 'student'
    })
    setShowEditModal(true)
    setOpenDropdown(null)
  }

  const updateUser = async () => {
    if (!selectedUser) return
    setUpdating(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name,
          phone: editForm.phone,
          role: editForm.role
        })
        .eq('id', selectedUser.id)

      if (error) throw error

      // Update local state
      setUsers(users.map((user: any) => 
        user.id === selectedUser.id 
          ? { ...user, full_name: editForm.full_name, phone: editForm.phone, role: editForm.role }
          : user
      ))

      setShowEditModal(false)
      setSelectedUser(null)
    } catch (error: any) {
      setError(error.message || t('users.error'))
    } finally {
      setUpdating(false)
    }
  }

  const openResetPasswordModal = (user: Profile) => {
    setSelectedUser(user)
    setNewPassword('')
    setShowResetPasswordModal(true)
    setOpenDropdown(null)
  }

  const resetPassword = async () => {
    if (!selectedUser || !newPassword) return
    setUpdating(true)
    setError(null)

    try {
      // For now, we'll show a success message but note that this requires
      // server-side implementation with service role key
      alert(`${t('users.newPassword')}: ${newPassword}\n\n${t('common.note')}: ${t('users.passwordResetNote')}`)
      
      setShowResetPasswordModal(false)
      setSelectedUser(null)
      setNewPassword('')
    } catch (error: any) {
      setError(error.message || t('users.error'))
    } finally {
      setUpdating(false)
    }
  }

  const openDeleteModal = (user: Profile) => {
    setSelectedUser(user)
    setShowDeleteModal(true)
    setOpenDropdown(null)
  }

  const deleteUser = async () => {
    if (!selectedUser) return
    setUpdating(true)
    setError(null)

    try {
      // Call API route to delete user
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user')
      }

      // Update local state - remove user from list
      setUsers(users.filter((user: any) => user.id !== selectedUser.id))

      setShowDeleteModal(false)
      setSelectedUser(null)
      alert(t('users.userDeleted'))
      
      // Log the deletion
      await supabase
        .from('activity_logs')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          action: 'user_deleted',
          entity_type: 'user',
          entity_id: selectedUser.id,
          entity_name: selectedUser.full_name || selectedUser.email,
          metadata: { deletedUserEmail: selectedUser.email }
        })
    } catch (error: any) {
      setError(error.message || t('users.error'))
    } finally {
      setUpdating(false)
    }
  }

  const filteredUsers = users.filter((user: any) => {
    const matchesSearch = (user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = filterRole === 'all' || user.role === filterRole
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' ? user.status !== 'frozen' : user.status === 'frozen')
    
    return matchesSearch && matchesRole && matchesStatus
  })

  const getRoleBadge = (role: string | null) => {
    switch(role) {
      case 'admin':
        return 'bg-purple-500/20 text-purple-400'
      case 'instructor':
        return 'bg-blue-500/20 text-blue-400'
      case 'student':
      default:
        return 'bg-gold-500/20 text-gold-400'
    }
  }

  const getRoleLabel = (role: string | null) => {
    switch(role) {
      case 'admin': return t('users.administrator')
      case 'instructor': return t('users.instructor')
      case 'student': return t('users.student')
      default: return role || t('users.noRole')
    }
  }

  const getStatusBadge = (status: string | null) => {
    return status === 'frozen' 
      ? 'bg-blue-500/20 text-blue-400' 
      : 'bg-green-500/20 text-green-400'
  }

  const getStatusLabel = (status: string | null) => {
    return status === 'frozen' ? t('users.frozen') : t('users.active')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gold">{t('users.title')}</h1>
          <p className="text-gold-300 mt-1">{t('users.subtitle')}</p>
        </div>
        <Button 
          variant="primary" 
          icon={<Plus className="w-5 h-5" />}
          onClick={() => setShowNewUserModal(true)}
        >
          {t('users.newUser')}
        </Button>
      </div>

      {/* Search, Filters and View Toggle */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-400" />
          <input
            type="text"
            placeholder={t('users.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
          />
        </div>
        <ViewToggle view={viewMode} onViewChange={setViewMode} />
        <Button 
          variant="secondary" 
          icon={<Filter className="w-5 h-5" />}
          onClick={() => setShowFilters(!showFilters)}
        >
          {t('users.filters')}
        </Button>
      </div>

      {/* Filters Panel with Chips */}
      {showFilters && (
        <Card variant="outlined">
          <div className="space-y-4">
            {/* Role Filters */}
            <div>
              <p className="text-sm font-medium text-gold-300 mb-3">Função</p>
              <div className="flex flex-wrap gap-2">
                <Chip
                  label="Todos"
                  selected={filterRole === 'all'}
                  onClick={() => setFilterRole('all')}
                  count={users.length}
                />
                <Chip
                  label="Administrador"
                  selected={filterRole === 'admin'}
                  onClick={() => setFilterRole('admin')}
                  icon={<Shield className="w-4 h-4" />}
                  count={users.filter((u: any) => u.role === 'admin').length}
                  color="purple"
                />
                <Chip
                  label="Professor"
                  selected={filterRole === 'instructor' || filterRole === 'teacher'}
                  onClick={() => setFilterRole('instructor')}
                  icon={<GraduationCap className="w-4 h-4" />}
                  count={users.filter((u: any) => u.role === 'instructor' || u.role === 'teacher').length}
                  color="blue"
                />
                <Chip
                  label="Aluno"
                  selected={filterRole === 'student'}
                  onClick={() => setFilterRole('student')}
                  icon={<BookOpen className="w-4 h-4" />}
                  count={users.filter((u: any) => u.role === 'student').length}
                  color="green"
                />
              </div>
            </div>

            {/* Status Filters */}
            <div>
              <p className="text-sm font-medium text-gold-300 mb-3">Status</p>
              <div className="flex flex-wrap gap-2">
                <Chip
                  label="Todos"
                  selected={filterStatus === 'all'}
                  onClick={() => setFilterStatus('all')}
                />
                <Chip
                  label="Ativo"
                  selected={filterStatus === 'active'}
                  onClick={() => setFilterStatus('active')}
                  icon={<Check className="w-4 h-4" />}
                  count={users.filter((u: any) => u.status !== 'frozen').length}
                  color="green"
                />
                <Chip
                  label="Inativo"
                  selected={filterStatus === 'frozen'}
                  onClick={() => setFilterStatus('frozen')}
                  icon={<Snowflake className="w-4 h-4" />}
                  count={users.filter((u: any) => u.status === 'frozen').length}
                  color="blue"
                />
              </div>
            </div>

            {/* Clear Filters */}
            {(filterRole !== 'all' || filterStatus !== 'all') && (
              <div className="flex justify-end pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterRole('all')
                    setFilterStatus('all')
                  }}
                >
                  Limpar Filtros
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Total de Usuários</p>
              <p className="text-2xl font-bold text-gold mt-1">{users.length}</p>
            </div>
            <Users className="w-8 h-8 text-gold-500/30" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Administradores</p>
              <p className="text-2xl font-bold text-gold mt-1">
                {users.filter((u: any) => u.role === 'admin').length}
              </p>
            </div>
            <Shield className="w-8 h-8 text-purple-500/30" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Professores</p>
              <p className="text-2xl font-bold text-gold mt-1">
                {users.filter((u: any) => u.role === 'instructor' || u.role === 'teacher').length}
              </p>
            </div>
            <GraduationCap className="w-8 h-8 text-blue-500/30" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-300 text-sm">Alunos</p>
              <p className="text-2xl font-bold text-gold mt-1">
                {users.filter((u: any) => u.role === 'student').length}
              </p>
            </div>
            <BookOpen className="w-8 h-8 text-green-500/30" />
          </div>
        </Card>
      </div>

      {/* Users List or Grid */}
      {loading ? (
        <div className="space-y-6">
          {/* Cards Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <>
          {/* Results Count */}
          {filteredUsers.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gold-400">
                {filteredUsers.length} {filteredUsers.length === 1 ? 'usuário encontrado' : 'usuários encontrados'}
              </p>
            </div>
          )}

          {/* Grid View */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map((user) => (
              <UserCard
                key={user.id}
                user={{
                  ...user,
                  full_name: user.full_name ?? undefined,
                  created_at: user.created_at || new Date().toISOString(),
                  role: (user.role || 'student') as 'admin' | 'teacher' | 'instructor' | 'student',
                  is_active: user.status !== 'frozen'
                }}
                onEdit={() => openEditModal(user)}
                onToggleActive={() => updateUserStatus(user.id, user.status === 'frozen' ? 'active' : 'frozen')}
                onDelete={() => openDeleteModal(user)}
              />
            ))}
          </div>

          {/* Empty State */}
          {filteredUsers.length === 0 && (
            <Card variant="outlined" className="text-center py-12">
              <Users className="w-16 h-16 text-gold-500/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gold mb-2">Nenhum usuário encontrado</h3>
              <p className="text-gold-400 mb-6">
                {searchTerm || filterRole !== 'all' || filterStatus !== 'all'
                  ? 'Tente ajustar os filtros ou termo de busca'
                  : 'Comece adicionando seu primeiro usuário'}
              </p>
              {!(searchTerm || filterRole !== 'all' || filterStatus !== 'all') && (
                <Button
                  variant="primary"
                  icon={<Plus className="w-5 h-5" />}
                  onClick={() => setShowNewUserModal(true)}
                >
                  Adicionar Primeiro Usuário
                </Button>
              )}
            </Card>
          )}
        </>
      ) : (
        /* List View - Keeping the table */
        <Card>
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gold-500/20">
                    <th className="text-left py-3 px-4 text-gold-300 font-medium">{t('users.name')}</th>
                    <th className="text-left py-3 px-4 text-gold-300 font-medium">{t('users.contact')}</th>
                    <th className="text-left py-3 px-4 text-gold-300 font-medium">{t('users.role')}</th>
                    <th className="text-left py-3 px-4 text-gold-300 font-medium">{t('users.status')}</th>
                    <th className="text-left py-3 px-4 text-gold-300 font-medium">{t('users.createdAt')}</th>
                    <th className="text-left py-3 px-4 text-gold-300 font-medium">{t('users.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-gold-500/10 hover:bg-navy-700/20">
                      <td className="py-4 px-4">
                        <p className="font-medium text-gold">{user.full_name || t('users.noName')}</p>
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <p className="text-gold-200 text-sm flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </p>
                          {user.phone && (
                            <p className="text-gold-300 text-sm flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {user.phone}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(user.status)}`}>
                          {getStatusLabel(user.status)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-gold-300 text-sm">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '-'}
                        </span>
                      </td>
                      <td className="py-4 px-4 relative">
                        <button 
                          className="text-gold-400 hover:text-gold-200 transition-colors p-1"
                          onClick={() => setOpenDropdown(openDropdown === user.id ? null : user.id)}
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                        
                        {openDropdown === user.id && (
                          <div className="dropdown-menu absolute right-0 mt-2 w-48 bg-navy-800 border border-gold-500/20 rounded-lg shadow-lg z-10">
                            <button 
                              onClick={() => openEditModal(user)}
                              className="w-full px-4 py-2 text-left text-gold-200 hover:bg-navy-700 flex items-center gap-2 rounded-t-lg"
                            >
                              <Edit className="w-4 h-4" />
                              {t('users.edit')}
                            </button>
                            {user.role === 'student' && (
                              <Link 
                                href={`/dashboard/users/${user.id}/grades`}
                                onClick={() => setOpenDropdown(null)}
                                className="w-full px-4 py-2 text-left text-gold-200 hover:bg-navy-700 flex items-center gap-2 block"
                              >
                                <FileText className="w-4 h-4" />
                                Ver Notas
                              </Link>
                            )}
                            <button 
                              onClick={() => openResetPasswordModal(user)}
                              className="w-full px-4 py-2 text-left text-gold-200 hover:bg-navy-700 flex items-center gap-2"
                            >
                              <Key className="w-4 h-4" />
                              {t('users.resetPassword')}
                            </button>
                            {user.status === 'frozen' ? (
                              <button 
                                onClick={() => updateUserStatus(user.id, 'active')}
                                className="w-full px-4 py-2 text-left text-green-400 hover:bg-navy-700 flex items-center gap-2"
                              >
                                <Play className="w-4 h-4" />
                                {t('users.unfreeze')}
                              </button>
                            ) : (
                              <button 
                                onClick={() => updateUserStatus(user.id, 'frozen')}
                                className="w-full px-4 py-2 text-left text-blue-400 hover:bg-navy-700 flex items-center gap-2"
                              >
                                <Snowflake className="w-4 h-4" />
                                {t('users.freeze')}
                              </button>
                            )}
                            <button 
                              onClick={() => openDeleteModal(user)}
                              className="w-full px-4 py-2 text-left text-red-400 hover:bg-navy-700 flex items-center gap-2 rounded-b-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                              {t('users.delete')}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-6 pt-6 border-t border-gold-500/20">
              <p className="text-gold-300 text-sm">
                {t('common.showing')} {filteredUsers.length} {t('common.of')} {users.length} {t('users.title').toLowerCase()}
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm">{t('button.previous')}</Button>
                <Button variant="secondary" size="sm">{t('button.next')}</Button>
              </div>
            </div>
          </>
        </Card>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gold flex items-center gap-2">
                <Edit className="w-6 h-6" />
                {t('users.editUser')}
              </h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gold-400 hover:text-gold-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); updateUser(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gold-200 mb-2">
                  {t('users.fullName')}
                </label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gold-200 mb-2">
                  {t('users.email')}
                </label>
                <input
                  type="email"
                  value={selectedUser.email}
                  className="w-full px-4 py-2 bg-navy-900/30 border border-navy-600 rounded-lg text-gold-300 cursor-not-allowed"
                  disabled
                />
                <p className="text-xs text-gold-300 mt-1">{t('settings.emailCannotChange')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gold-200 mb-2">
                  {t('users.phone')}
                </label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: formatPhone(e.target.value) })}
                  className="w-full px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                  placeholder="(21) 98765-4321"
                  maxLength={15}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gold-200 mb-2">
                  {t('users.role')}
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as any })}
                  className="w-full px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                >
                  <option value="student">{t('users.student')}</option>
                  <option value="instructor">{t('users.instructor')}</option>
                  <option value="admin">{t('users.administrator')}</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1"
                >
                  {t('button.cancel')}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={updating}
                  className="flex-1"
                >
                  {updating ? t('users.updating') : t('button.save')}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gold flex items-center gap-2">
                <Key className="w-6 h-6" />
                {t('users.resetPassword')}
              </h2>
              <button
                onClick={() => setShowResetPasswordModal(false)}
                className="text-gold-400 hover:text-gold-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="mb-4">
              <p className="text-gold-200">{t('users.user')}: <span className="font-medium text-gold">{selectedUser.full_name || selectedUser.email}</span></p>
              <p className="text-gold-300 text-sm mt-1">{t('users.newPasswordWillBeSet')}</p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); resetPassword(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gold-200 mb-2">
                  {t('users.newPassword')}
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                  required
                  minLength={6}
                />
                <p className="text-xs text-gold-300 mt-1">{t('settings.minCharacters')}</p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowResetPasswordModal(false)}
                  className="flex-1"
                >
                  {t('button.cancel')}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={updating}
                  className="flex-1"
                >
                  {updating ? t('common.loading') : t('users.resetPassword')}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Delete User Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-red-400 flex items-center gap-2">
                <AlertCircle className="w-6 h-6" />
                {t('users.deleteUser')}
              </h2>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gold-400 hover:text-gold-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="mb-6">
              <p className="text-gold-200 mb-2">
                {t('users.confirmDelete')}
              </p>
              <div className="bg-navy-900/50 p-3 rounded-lg">
                <p className="text-gold font-medium">{selectedUser.full_name || t('users.noName')}</p>
                <p className="text-gold-300 text-sm">{selectedUser.email}</p>
              </div>
              <p className="text-red-400 text-sm mt-3">
                ⚠️ {t('users.deleteWarning')}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1"
              >
                {t('button.cancel')}
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={deleteUser}
                disabled={updating}
                className="flex-1 bg-red-500 hover:bg-red-600"
              >
                {updating ? t('users.deleting') : t('users.deleteUser')}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* New User Modal */}
      {showNewUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gold flex items-center gap-2">
                <UserPlus className="w-6 h-6" />
                {t('users.newUser')}
              </h2>
              <button
                onClick={() => setShowNewUserModal(false)}
                className="text-gold-400 hover:text-gold-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); createUser(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gold-200 mb-2">
                  {t('users.fullName')}
                </label>
                <input
                  type="text"
                  value={newUserForm.full_name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, full_name: e.target.value })}
                  className="w-full px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gold-200 mb-2">
                  {t('users.email')}
                </label>
                <input
                  type="email"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  className="w-full px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                  placeholder="usuario@exemplo.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gold-200 mb-2">
                  {t('users.phone')}
                </label>
                <input
                  type="tel"
                  value={newUserForm.phone}
                  onChange={(e) => setNewUserForm({ ...newUserForm, phone: formatPhone(e.target.value) })}
                  className="w-full px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                  placeholder="(21) 98765-4321"
                  maxLength={15}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gold-200 mb-2">
                  {t('users.password')}
                </label>
                <input
                  type="password"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  className="w-full px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 placeholder-gold-300/50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                  required
                  minLength={6}
                />
                <p className="text-xs text-gold-300 mt-1">{t('settings.minCharacters')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gold-200 mb-2">
                  {t('users.role')}
                </label>
                <select
                  value={newUserForm.role}
                  onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as any })}
                  className="w-full px-4 py-2 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                >
                  <option value="student">{t('users.student')}</option>
                  <option value="instructor">{t('users.instructor')}</option>
                  <option value="admin">{t('users.administrator')}</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowNewUserModal(false)}
                  className="flex-1"
                >
                  {t('button.cancel')}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={creating}
                  className="flex-1"
                >
                  {creating ? t('users.creating') : t('users.createUser')}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}