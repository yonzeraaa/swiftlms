'use client'

import { useState, useEffect } from 'react'
import { Save, Bell, Shield, Globe, Database as DatabaseIcon, User, Key, Check, X, Camera, Phone, Mail, Settings as SettingsIcon, HardDriveDownload, ExternalLink, Loader2, Trash2, AlertTriangle } from 'lucide-react'
import Spinner from '../../components/ui/Spinner'
import { Database } from '@/lib/database.types'
import { useTranslation } from '../../contexts/LanguageContext'
import { getUserProfileData, updateUserProfile } from '@/lib/actions/admin-settings'
import type { BackupSummary } from '@/lib/backup/types'
import type { SetupWizardState } from '@/lib/setup/types'
import { ClassicRule } from '../../components/ui/RenaissanceSvgs'

const INK = '#1e130c'
const MUTED = '#7a6350'
const PARCH = '#faf6ee'

type Profile = Database['public']['Tables']['profiles']['Row']

interface UserSettings {
  notifications: {
    email: boolean
    courseUpdates: boolean
    newEnrollments: boolean
    systemUpdates: boolean
  }
  privacy: {
    profileVisibility: 'public' | 'private' | 'connections'
    showEmail: boolean
    showPhone: boolean
  }
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [versionInfo, setVersionInfo] = useState<{
    version: string
    gitHash: string
    gitDate: string
    buildDate: string
  } | null>(null)
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    bio: ''
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const { t } = useTranslation()
  const [settings, setSettings] = useState<UserSettings>({
    notifications: {
      email: true,
      courseUpdates: true,
      newEnrollments: true,
      systemUpdates: false
    },
    privacy: {
      profileVisibility: 'public',
      showEmail: true,
      showPhone: false
    }
  })
  const [activeTab, setActiveTab] = useState('profile')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [userId, setUserId] = useState<string>('')
  const [backupState, setBackupState] = useState<{
    status: 'idle' | 'running' | 'success' | 'error'
    lastResult: {
      backupId: string
      status: string
      driveFolderUrl: string
      tablesExported: number
      filesExported: number
      bytesUploaded: number
      completedAt: string
    } | null
    error: string | null
  }>({ status: 'idle', lastResult: null, error: null })
  const [availableBackups, setAvailableBackups] = useState<BackupSummary[]>([])
  const [backupListState, setBackupListState] = useState<{
    status: 'idle' | 'running' | 'success' | 'error'
    error: string | null
  }>({ status: 'idle', error: null })
  const [selectedBackupId, setSelectedBackupId] = useState<string>('')
  const [restoreOptions, setRestoreOptions] = useState({
    restoreDatabase: true,
    restoreStorage: true
  })
  const [restoreState, setRestoreState] = useState<{
    status: 'idle' | 'running' | 'success' | 'error'
    lastResult: {
      backupId: string
      mode: 'dry-run' | 'apply'
      validatedArtifacts: number
      restoredTables: number
      restoredFiles: number
    } | null
    error: string | null
  }>({ status: 'idle', lastResult: null, error: null })
  const [restoreModal, setRestoreModal] = useState<{
    open: boolean
    status: 'idle' | 'running' | 'success' | 'error'
    error: string | null
  }>({ open: false, status: 'idle', error: null })
  const [clearModal, setClearModal] = useState<{
    open: boolean
    password: string
    status: 'idle' | 'running' | 'success' | 'error'
    error: string | null
  }>({ open: false, password: '', status: 'idle', error: null })
  const [installationState, setInstallationState] = useState<SetupWizardState | null>(null)
  const [installationValidationState, setInstallationValidationState] = useState<{
    status: 'idle' | 'running' | 'success' | 'error'
    error: string | null
  }>({ status: 'idle', error: null })

  useEffect(() => {
    fetchUserData()
    fetchVersion()
    fetchInstallationState()
    fetchBackups()
  }, [])

  useEffect(() => {
    if (!selectedBackupId && availableBackups.length > 0) {
      setSelectedBackupId(availableBackups[0].backupId)
    }
  }, [availableBackups, selectedBackupId])

  const fetchVersion = async () => {
    try {
      const response = await fetch('/version.json')
      if (response.ok) {
        const data = await response.json()
        setVersionInfo(data)
      }
    } catch (error) {
      console.error('Error fetching version:', error)
      setVersionInfo({
        version: '1.0.0',
        gitHash: 'unknown',
        gitDate: new Date().toISOString(),
        buildDate: new Date().toISOString()
      })
    }
  }

  const fetchUserData = async () => {
    try {
      const result = await getUserProfileData()

      if (result.success && result.profile) {
        setCurrentUser(result.profile)
        setUserId(result.userId || '')
        setProfileForm({
          full_name: result.profile.full_name || '',
          email: result.profile.email,
          phone: result.profile.phone || '',
          bio: result.profile.bio || ''
        })
      } else {
        console.error('Error fetching user data:', result.error)
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchInstallationState = async () => {
    try {
      const response = await fetch('/api/setup/status', { credentials: 'include' })
      const data = await response.json()
      if (response.ok) {
        setInstallationState(data.state)
      }
    } catch (error) {
      console.error('Error fetching installation state:', error)
    }
  }

  const fetchBackups = async () => {
    setBackupListState({ status: 'running', error: null })
    try {
      const response = await fetch('/api/admin/backup/restore', { credentials: 'include' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Falha ao carregar backups')
      setAvailableBackups(data.backups || [])
      setBackupListState({ status: 'success', error: null })
    } catch (error: any) {
      setBackupListState({ status: 'error', error: error.message })
    }
  }

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    const truncated = numbers.slice(0, 11)
    
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

  const handleProfileSave = async () => {
    if (!currentUser || !userId) return
    setSaving(true)
    setMessage(null)

    try {
      const result = await updateUserProfile({
        userId,
        full_name: profileForm.full_name,
        phone: profileForm.phone,
        bio: profileForm.bio
      })

      if (result.success) {
        setMessage({ type: 'success', text: t('settings.profileUpdated') })
        setCurrentUser({
          ...currentUser,
          full_name: profileForm.full_name,
          phone: profileForm.phone,
          bio: profileForm.bio
        })
      } else {
        setMessage({ type: 'error', text: result.error || t('settings.error') + ' ' + t('settings.profile').toLowerCase() })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || t('settings.error') + ' ' + t('settings.profile').toLowerCase() })
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: t('settings.passwordsDontMatch') })
      return
    }

    if (passwordForm.newPassword.length < 6) {
      setMessage({ type: 'error', text: t('settings.passwordTooShort') })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/settings/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newPassword: passwordForm.newPassword })
      })

      const result = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: t('settings.passwordChanged') })
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
      } else {
        setMessage({ type: 'error', text: result.error || t('settings.error') + ' ' + t('settings.password').toLowerCase() })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || t('settings.error') + ' ' + t('settings.password').toLowerCase() })
    } finally {
      setSaving(false)
    }
  }

  const handleSettingsSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      setMessage({ type: 'success', text: t('settings.title') + ' ' + t('settings.success') })
    } catch {
      setMessage({ type: 'error', text: t('settings.error') + ' ' + t('settings.title').toLowerCase() })
    } finally {
      setSaving(false)
    }
  }

  const handleClearData = async () => {
    setClearModal(prev => ({ ...prev, status: 'running', error: null }))
    try {
      const response = await fetch('/api/admin/clear-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: clearModal.password }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Falha ao limpar dados')
      setClearModal(prev => ({ ...prev, status: 'success', error: null }))
    } catch (error: any) {
      setClearModal(prev => ({ ...prev, status: 'error', error: error.message }))
    }
  }

  const handleBackup = async () => {
    setBackupState({ status: 'running', lastResult: null, error: null })
    try {
      const response = await fetch('/api/admin/backup', { method: 'POST', credentials: 'include' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Falha ao executar backup')
      setBackupState({ status: 'success', lastResult: data, error: null })
      await fetchBackups()
    } catch (error: any) {
      setBackupState({ status: 'error', lastResult: null, error: error.message })
    }
  }

  const handleBackupValidation = async () => {
    if (!selectedBackupId) return

    setRestoreState({ status: 'running', lastResult: null, error: null })
    try {
      const response = await fetch('/api/admin/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          backupId: selectedBackupId,
          apply: false,
          restoreDatabase: restoreOptions.restoreDatabase,
          restoreStorage: restoreOptions.restoreStorage,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Falha ao validar backup')
      setRestoreState({ status: 'success', lastResult: data, error: null })
    } catch (error: any) {
      setRestoreState({ status: 'error', lastResult: null, error: error.message })
    }
  }

  const handleBackupRestore = async () => {
    if (!selectedBackupId) return

    setRestoreModal(prev => ({ ...prev, status: 'running', error: null }))
    try {
      const response = await fetch('/api/admin/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          backupId: selectedBackupId,
          apply: true,
          restoreDatabase: restoreOptions.restoreDatabase,
          restoreStorage: restoreOptions.restoreStorage,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Falha ao restaurar backup')
      setRestoreState({ status: 'success', lastResult: data, error: null })
      setRestoreModal({ open: false, status: 'success', error: null })
    } catch (error: any) {
      setRestoreModal({ open: true, status: 'error', error: error.message })
      setRestoreState({ status: 'error', lastResult: null, error: error.message })
    }
  }

  const handleInstallationValidation = async () => {
    setInstallationValidationState({ status: 'running', error: null })
    try {
      const response = await fetch('/api/setup/validate', { credentials: 'include' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Falha ao validar instalação')
      await fetchInstallationState()
      setInstallationValidationState({ status: 'success', error: null })
    } catch (error: any) {
      setInstallationValidationState({ status: 'error', error: error.message })
    }
  }

  const tabs = [
    { id: 'profile', label: t('settings.profile'), icon: User },
    { id: 'password', label: t('settings.password'), icon: Key },
    { id: 'notifications', label: t('settings.notifications'), icon: Bell },
    { id: 'privacy', label: t('settings.privacy'), icon: Shield },
    { id: 'backup', label: 'Backup', icon: HardDriveDownload },
    { id: 'installation', label: 'Instalação', icon: DatabaseIcon }
  ]

  if (loading) {
    return <Spinner fullPage size="xl" />
  }

  return (
    <div className="flex flex-col w-full">
      {/* ── Cabeçalho Principal ── */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 w-full border-b border-[#1e130c]/10 pb-6">
        <div className="flex-1">
          <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 'clamp(2rem, 4vw, 2.75rem)', fontWeight: 700, color: INK, lineHeight: 1.1 }}>
            {t('settings.title')}
          </h1>
          <p style={{ fontFamily: 'var(--font-lora)', fontSize: '1rem', fontStyle: 'italic', color: MUTED, marginTop: '0.25rem' }}>
            {t('settings.subtitle')}
          </p>
          <div className="mt-4 w-full max-w-xs">
            <ClassicRule color={INK} />
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 mb-6 flex items-center gap-3 border ${
          message.type === 'success'
            ? 'bg-[#1e130c]/[0.02] text-[#1e130c] border-[#1e130c]/10'
            : 'bg-[#7a6350]/[0.05] text-[#7a6350] italic border-[#7a6350]/20'
        }`} style={{ fontFamily: 'var(--font-lora)' }}>
          {message.type === 'success' ? <Check className="w-5 h-5 flex-shrink-0 opacity-50" /> : <X className="w-5 h-5 flex-shrink-0 opacity-50" />}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-[#1e130c]/10 mb-8 overflow-x-auto custom-scrollbar">
        <nav className="-mb-px flex space-x-8 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  group inline-flex items-center gap-2 border-b-2 py-4 px-1 text-[0.65rem] font-bold transition-all duration-300
                  ${isActive
                    ? 'border-[#8b6d22] text-[#1e130c]'
                    : 'border-transparent text-[#7a6350] hover:text-[#1e130c] hover:border-[#1e130c]/20'
                  }
                `}
                style={{ fontFamily: 'var(--font-lora)', textTransform: 'uppercase', letterSpacing: '0.15em' }}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-[#8b6d22]' : 'text-[#7a6350]'}`} />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Content Area */}
      <div className="bg-white/40 border border-[#1e130c]/10 p-6 md:p-8">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-8">
            <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1e130c] mb-6 pb-2 border-b border-[#1e130c]/5">{t('settings.profileInfo')}</h2>
            
            {/* Avatar Section */}
            <div className="flex items-center gap-6 mb-8">
              <div className="relative group">
                <div className="w-24 h-24 bg-[#faf6ee] border border-[#1e130c]/10 flex items-center justify-center text-[#1e130c] transition-colors group-hover:bg-[#1e130c]/5">
                  <User className="w-10 h-10 text-[#8b6d22]" />
                </div>
                <button className="absolute -bottom-2 -right-2 p-2 bg-[#1e130c] text-[#faf6ee] border border-[#faf6ee] hover:bg-[#8b6d22] transition-colors">
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <div>
                <h3 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1e130c] tracking-tight">{currentUser?.full_name || t('settings.noName')}</h3>
                <p className="text-[0.7rem] text-[#7a6350] uppercase tracking-[0.2em] font-bold mt-1">
                  {currentUser?.role === 'admin' ? t('settings.administrator') : currentUser?.role === 'instructor' ? t('settings.instructor') : t('settings.student')}
                </p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-[family-name:var(--font-lora)]">
              <div>
                <label className="block text-[0.65rem] font-bold uppercase text-[#7a6350] tracking-[0.2em] mb-2">
                  {t('settings.fullName')} <span className="text-[#8b6d22]">*</span>
                </label>
                <input
                  type="text"
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                  className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] focus:ring-0 focus:border-[#8b6d22] transition-colors rounded-none text-base font-medium"
                />
              </div>

              <div>
                <label className="block text-[0.65rem] font-bold uppercase text-[#7a6350] tracking-[0.2em] mb-2">
                  {t('settings.email')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7a6350] opacity-50" />
                  <input
                    type="email"
                    value={profileForm.email}
                    disabled
                    className="w-full pl-6 pr-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/10 text-[#7a6350] italic rounded-none cursor-not-allowed text-base"
                  />
                </div>
                <p className="text-[0.6rem] text-[#7a6350] uppercase tracking-widest mt-1.5 opacity-60">{t('settings.emailCannotChange')}</p>
              </div>

              <div>
                <label className="block text-[0.65rem] font-bold uppercase text-[#7a6350] tracking-[0.2em] mb-2">
                  {t('settings.phone')}
                </label>
                <div className="relative">
                  <Phone className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b6d22]" />
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: formatPhone(e.target.value) })}
                    placeholder="(21) 98765-4321"
                    maxLength={15}
                    className="w-full pl-6 pr-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] focus:ring-0 focus:border-[#8b6d22] transition-colors rounded-none text-base font-medium"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-[0.65rem] font-bold uppercase text-[#7a6350] tracking-[0.2em] mb-2">
                  {t('settings.bio')}
                </label>
                <textarea
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  rows={3}
                  placeholder={t('settings.bioPlaceholder')}
                  className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] placeholder-[#7a6350]/30 focus:ring-0 focus:border-[#8b6d22] transition-colors rounded-none resize-none italic text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={handleProfileSave}
                disabled={saving}
                style={{ padding: '0.75rem 2rem', backgroundColor: INK, color: PARCH, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-lora)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                className="hover:bg-[#8b6d22] transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Gravando...' : t('settings.saveChanges')}
              </button>
            </div>
          </div>
        )}

        {/* Password Tab */}
        {activeTab === 'password' && (
          <div className="space-y-8 max-w-xl">
            <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1e130c] mb-6 pb-2 border-b border-[#1e130c]/5">{t('settings.changePassword')}</h2>
            
            <div className="space-y-6 font-[family-name:var(--font-lora)]">
              <div>
                <label className="block text-[0.65rem] font-bold uppercase text-[#7a6350] tracking-[0.2em] mb-2">
                  Senha Atual
                </label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] focus:ring-0 focus:border-[#8b6d22] transition-colors rounded-none text-base tracking-widest font-mono"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-[0.65rem] font-bold uppercase text-[#7a6350] tracking-[0.2em] mb-2">
                  Nova Senha
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] focus:ring-0 focus:border-[#8b6d22] transition-colors rounded-none text-base tracking-widest font-mono"
                  placeholder="••••••••"
                />
                <p className="text-[0.6rem] text-[#7a6350] uppercase tracking-widest mt-1.5 opacity-60">Mínimo 6 caracteres</p>
              </div>

              <div>
                <label className="block text-[0.65rem] font-bold uppercase text-[#7a6350] tracking-[0.2em] mb-2">
                  Confirmar Nova Senha
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] focus:ring-0 focus:border-[#8b6d22] transition-colors rounded-none text-base tracking-widest font-mono"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={handlePasswordChange}
                  disabled={saving}
                  style={{ padding: '0.75rem 2rem', backgroundColor: INK, color: PARCH, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-lora)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  className="hover:bg-[#8b6d22] transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                  {saving ? 'Alterando...' : 'Alterar Senha'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-8">
            <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1e130c] mb-6 pb-2 border-b border-[#1e130c]/5">Preferências de Notificação</h2>
            
            <div className="space-y-4 font-[family-name:var(--font-lora)]">
              {Object.entries({
                email: { label: 'Notificações por Email', description: 'Receber notificações importantes por email' },
                courseUpdates: { label: 'Atualizações de Cursos', description: 'Notificar sobre mudanças nos cursos matriculados' },
                newEnrollments: { label: 'Novas Matrículas', description: 'Notificar quando alunos se matriculam em seus cursos' },
                systemUpdates: { label: 'Atualizações do Sistema', description: 'Notificar sobre manutenções e novidades' }
              }).map(([key, info]) => (
                <label key={key} className="flex items-center justify-between p-4 bg-[#faf6ee] border border-[#1e130c]/10 cursor-pointer hover:border-[#8b6d22]/40 transition-colors">
                  <div className="flex items-start gap-4">
                    <Bell className="w-4 h-4 text-[#8b6d22] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[0.75rem] font-bold uppercase tracking-widest text-[#1e130c]">{info.label}</p>
                      <p className="text-[0.7rem] text-[#7a6350] italic mt-0.5">{info.description}</p>
                    </div>
                  </div>
                  <div className="relative flex items-center ml-4">
                    <input
                      type="checkbox"
                      checked={settings.notifications[key as keyof typeof settings.notifications]}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, [key]: e.target.checked }
                      })}
                      className="w-5 h-5 text-[#8b6d22] bg-transparent border-[#1e130c]/30 rounded-none focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                  </div>
                </label>
              ))}

              <div className="flex justify-end pt-6">
                <button
                  onClick={handleSettingsSave}
                  disabled={saving}
                  style={{ padding: '0.75rem 2rem', backgroundColor: INK, color: PARCH, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-lora)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  className="hover:bg-[#8b6d22] transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Gravando...' : 'Salvar Preferências'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Privacy Tab */}
        {activeTab === 'privacy' && (
          <div className="space-y-8 max-w-xl">
            <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1e130c] mb-6 pb-2 border-b border-[#1e130c]/5">Privacidade do Perfil</h2>
            
            <div className="space-y-6 font-[family-name:var(--font-lora)]">
              <div>
                <label className="block text-[0.65rem] font-bold uppercase text-[#7a6350] tracking-[0.2em] mb-2">
                  Nível de Visibilidade
                </label>
                <select
                  value={settings.privacy.profileVisibility}
                  onChange={(e) => setSettings({
                    ...settings,
                    privacy: { ...settings.privacy, profileVisibility: e.target.value as any }
                  })}
                  className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] focus:ring-0 focus:border-[#8b6d22] transition-colors rounded-none cursor-pointer text-sm font-bold"
                >
                  <option value="public" className="bg-[#faf6ee]">Público Geral</option>
                  <option value="connections" className="bg-[#faf6ee]">Apenas Conexões</option>
                  <option value="private" className="bg-[#faf6ee]">Estritamente Privado</option>
                </select>
              </div>

              <div className="space-y-4 pt-4">
                <label className="flex items-center justify-between p-4 bg-[#faf6ee] border border-[#1e130c]/10 cursor-pointer hover:border-[#8b6d22]/40 transition-colors">
                  <div>
                    <p className="text-[0.75rem] font-bold uppercase tracking-widest text-[#1e130c]">Exibir Email</p>
                    <p className="text-[0.7rem] text-[#7a6350] italic mt-0.5">Tornar o endereço de email público no perfil</p>
                  </div>
                  <div className="relative flex items-center ml-4">
                    <input
                      type="checkbox"
                      checked={settings.privacy.showEmail}
                      onChange={(e) => setSettings({
                        ...settings,
                        privacy: { ...settings.privacy, showEmail: e.target.checked }
                      })}
                      className="w-5 h-5 text-[#8b6d22] bg-transparent border-[#1e130c]/30 rounded-none focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                  </div>
                </label>

                <label className="flex items-center justify-between p-4 bg-[#faf6ee] border border-[#1e130c]/10 cursor-pointer hover:border-[#8b6d22]/40 transition-colors">
                  <div>
                    <p className="text-[0.75rem] font-bold uppercase tracking-widest text-[#1e130c]">Exibir Telefone</p>
                    <p className="text-[0.7rem] text-[#7a6350] italic mt-0.5">Tornar o número de telefone público no perfil</p>
                  </div>
                  <div className="relative flex items-center ml-4">
                    <input
                      type="checkbox"
                      checked={settings.privacy.showPhone}
                      onChange={(e) => setSettings({
                        ...settings,
                        privacy: { ...settings.privacy, showPhone: e.target.checked }
                      })}
                      className="w-5 h-5 text-[#8b6d22] bg-transparent border-[#1e130c]/30 rounded-none focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                  </div>
                </label>
              </div>

              <div className="flex justify-end pt-6">
                <button
                  onClick={handleSettingsSave}
                  disabled={saving}
                  style={{ padding: '0.75rem 2rem', backgroundColor: INK, color: PARCH, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-lora)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  className="hover:bg-[#8b6d22] transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Gravando...' : 'Salvar Privacidade'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Backup Tab */}
        {activeTab === 'backup' && (
          <div className="space-y-8 max-w-4xl">
            <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1e130c] mb-6 pb-2 border-b border-[#1e130c]/5">Gestão de Backup e Restauração</h2>
            
            <div className="space-y-8 font-[family-name:var(--font-lora)]">
              <p className="text-sm text-[#7a6350] italic leading-relaxed">
                A rotina de backup exporta dados vitais do sistema (alunos, matrizes curriculares, templates e avaliações) em artefatos criptografados para uma unidade segura no Google Drive.
              </p>

              {/* Status feedback */}
              {backupState.status === 'success' && backupState.lastResult && (
                <div className="p-5 bg-white/40 border border-[#8b6d22]/30 space-y-3">
                  <div className="flex items-center gap-3 text-[#1e130c] font-bold uppercase tracking-widest text-[0.7rem]">
                    <Check className="w-4 h-4 text-[#8b6d22]" />
                    Processo de Backup Finalizado
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[#7a6350]">
                    <div className="space-y-1.5">
                      <p>Identificador: <span className="text-[#1e130c] font-bold font-mono">{backupState.lastResult.backupId}</span></p>
                      <p>Status da Operação: <span className="text-[#1e130c] font-bold uppercase">{backupState.lastResult.status}</span></p>
                      <p>Data/Hora: <span className="text-[#1e130c] font-bold">{new Date(backupState.lastResult.completedAt).toLocaleString('pt-BR')}</span></p>
                    </div>
                    <div className="space-y-1.5">
                      <p>Tabelas Exportadas: <span className="text-[#1e130c] font-bold">{backupState.lastResult.tablesExported}</span></p>
                      <p>Arquivos Transferidos: <span className="text-[#1e130c] font-bold">{backupState.lastResult.filesExported}</span></p>
                      <p>Volume Enviado: <span className="text-[#1e130c] font-bold">{(backupState.lastResult.bytesUploaded / 1024).toFixed(2)} KB</span></p>
                    </div>
                  </div>
                  <div className="pt-2">
                    <a
                      href={backupState.lastResult.driveFolderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-widest text-[#8b6d22] hover:text-[#1e130c] transition-colors border-b border-[#8b6d22]/30 hover:border-[#1e130c] pb-0.5"
                    >
                      Acessar Arquivos no Google Drive <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              {backupState.status === 'error' && (
                <div className="flex items-start gap-3 p-5 bg-[#7a6350]/5 border border-red-900/20 text-[#7a6350]">
                  <X className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <p className="font-bold uppercase text-[0.65rem] tracking-widest mb-1">Falha na Operação</p>
                    <p className="text-sm italic">{backupState.error}</p>
                  </div>
                </div>
              )}

              <div>
                <button
                  onClick={handleBackup}
                  disabled={backupState.status === 'running'}
                  style={{ padding: '0.85rem 2.5rem', backgroundColor: INK, color: PARCH, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-lora)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}
                  className="hover:bg-[#8b6d22] transition-colors disabled:opacity-50"
                >
                  {backupState.status === 'running' ? <Loader2 className="w-4 h-4 animate-spin" /> : <HardDriveDownload className="w-4 h-4" />}
                  {backupState.status === 'running' ? 'Processando Exportação...' : 'Solicitar Novo Backup'}
                </button>
              </div>

              <div className="pt-8 border-t border-[#1e130c]/10 space-y-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1e130c]">Restauração do Sistema</h3>
                    <p className="text-sm text-[#7a6350] italic mt-1">Valide os artefatos antes de aplicar a restauração completa no banco operacional.</p>
                  </div>
                  <button
                    onClick={fetchBackups}
                    disabled={backupListState.status === 'running'}
                    className="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-widest text-[#8b6d22] hover:text-[#1e130c] transition-colors disabled:opacity-50"
                  >
                    {backupListState.status === 'running' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                    Sincronizar Lista
                  </button>
                </div>

                {backupListState.status === 'error' && backupListState.error && (
                  <div className="p-4 border border-red-900/20 bg-[#7a6350]/5 text-sm text-[#7a6350] italic">
                    {backupListState.error}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="block text-[0.65rem] font-bold uppercase text-[#7a6350] tracking-[0.2em]">
                      Selecionar Ponto de Restauração
                    </label>
                    <select
                      value={selectedBackupId}
                      onChange={(e) => setSelectedBackupId(e.target.value)}
                      className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#1e130c]/30 text-[#1e130c] focus:ring-0 focus:border-[#8b6d22] transition-colors rounded-none cursor-pointer text-sm font-mono"
                    >
                      {availableBackups.length === 0 && (
                        <option value="" className="font-sans italic">Nenhum registro encontrado</option>
                      )}
                      {availableBackups.map(backup => (
                        <option key={backup.backupId} value={backup.backupId} className="bg-[#faf6ee]">
                          {backup.backupId} • {backup.status.toUpperCase()}
                        </option>
                      ))}
                    </select>

                    {selectedBackupId && (
                      <div className="p-4 bg-white/40 border border-[#1e130c]/10 text-xs text-[#7a6350] space-y-1.5">
                        {availableBackups
                          .filter(backup => backup.backupId === selectedBackupId)
                          .map(backup => (
                            <div key={backup.backupId} className="space-y-1">
                              <p className="flex justify-between"><span>Status:</span> <span className="text-[#1e130c] font-bold uppercase">{backup.status}</span></p>
                              <p className="flex justify-between"><span>Data:</span> <span className="text-[#1e130c] font-bold">{backup.completedAt ? new Date(backup.completedAt).toLocaleString('pt-BR') : 'N/A'}</span></p>
                              <p className="flex justify-between"><span>Tabelas:</span> <span className="text-[#1e130c] font-bold">{backup.tablesExported}</span></p>
                              <p className="flex justify-between"><span>Arquivos:</span> <span className="text-[#1e130c] font-bold">{backup.filesExported}</span></p>
                              <div className="pt-2 mt-2 border-t border-[#1e130c]/10">
                                <a
                                  href={backup.driveFolderUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[0.6rem] font-bold uppercase tracking-widest text-[#8b6d22] hover:text-[#1e130c] transition-colors"
                                >
                                  Ver Fonte no Drive <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <label className="block text-[0.65rem] font-bold uppercase text-[#7a6350] tracking-[0.2em]">
                      Escopo da Restauração
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-center justify-between p-4 bg-[#faf6ee] border border-[#1e130c]/10 cursor-pointer hover:border-[#8b6d22]/40 transition-colors">
                        <div>
                          <p className="text-[0.7rem] font-bold uppercase tracking-widest text-[#1e130c]">Banco de Dados</p>
                          <p className="text-xs text-[#7a6350] italic mt-0.5">Tabelas e perfis de usuário</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={restoreOptions.restoreDatabase}
                          onChange={(e) => setRestoreOptions(prev => ({ ...prev, restoreDatabase: e.target.checked }))}
                          className="w-4 h-4 text-[#8b6d22] bg-transparent border-[#1e130c]/30 rounded-none focus:ring-0 focus:ring-offset-0 cursor-pointer"
                        />
                      </label>

                      <label className="flex items-center justify-between p-4 bg-[#faf6ee] border border-[#1e130c]/10 cursor-pointer hover:border-[#8b6d22]/40 transition-colors">
                        <div>
                          <p className="text-[0.7rem] font-bold uppercase tracking-widest text-[#1e130c]">Arquivos Storage</p>
                          <p className="text-xs text-[#7a6350] italic mt-0.5">Certificados e avatares (Buckets)</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={restoreOptions.restoreStorage}
                          onChange={(e) => setRestoreOptions(prev => ({ ...prev, restoreStorage: e.target.checked }))}
                          className="w-4 h-4 text-[#8b6d22] bg-transparent border-[#1e130c]/30 rounded-none focus:ring-0 focus:ring-offset-0 cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {restoreState.status === 'success' && restoreState.lastResult && (
                  <div className="p-4 bg-white/40 border border-[#8b6d22]/30 space-y-2">
                    <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#8b6d22] mb-3">Relatório da Operação</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-[#7a6350]">
                      <p>Modo: <span className="text-[#1e130c] font-bold uppercase">{restoreState.lastResult.mode === 'dry-run' ? 'Validação (Dry-Run)' : 'Restauração Efetiva'}</span></p>
                      <p>Artefatos: <span className="text-[#1e130c] font-bold">{restoreState.lastResult.validatedArtifacts} Validados</span></p>
                      <p>Tabelas: <span className="text-[#1e130c] font-bold">{restoreState.lastResult.restoredTables} Restauradas</span></p>
                      <p>Arquivos: <span className="text-[#1e130c] font-bold">{restoreState.lastResult.restoredFiles} Recuperados</span></p>
                    </div>
                  </div>
                )}

                {restoreState.status === 'error' && restoreState.error && (
                  <div className="p-4 border border-red-900/20 bg-[#7a6350]/5 text-sm text-[#7a6350] italic">
                    <span className="font-bold text-red-900 not-italic uppercase text-[0.65rem] tracking-widest block mb-1">Erro na Restauração</span>
                    {restoreState.error}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <button
                    onClick={handleBackupValidation}
                    disabled={!selectedBackupId || restoreState.status === 'running' || (!restoreOptions.restoreDatabase && !restoreOptions.restoreStorage)}
                    className="flex-1 py-3 border border-[#1e130c]/20 text-[#1e130c] font-bold uppercase tracking-[0.15em] text-[0.65rem] hover:bg-[#1e130c]/5 transition-colors disabled:opacity-30 flex items-center justify-center gap-2"
                  >
                    {restoreState.status === 'running' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {restoreState.status === 'running' ? 'Processando...' : 'Validar Integridade (Dry-Run)'}
                  </button>

                  <button
                    onClick={() => setRestoreModal({ open: true, status: 'idle', error: null })}
                    disabled={!selectedBackupId || !(restoreState.lastResult?.backupId === selectedBackupId && restoreState.lastResult.mode === 'dry-run') || (!restoreOptions.restoreDatabase && !restoreOptions.restoreStorage)}
                    className="flex-1 py-3 bg-[#1e130c] text-[#faf6ee] font-bold uppercase tracking-[0.15em] text-[0.65rem] hover:bg-red-900 transition-colors disabled:opacity-30 flex items-center justify-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Aplicar Restauração Definitiva
                  </button>
                </div>
              </div>

              <div className="p-6 bg-[#faf6ee] border border-[#1e130c]/10 text-sm text-[#7a6350] mt-8">
                <p className="font-bold text-[#1e130c] uppercase text-[0.65rem] tracking-widest mb-3">Automação de Sistema (Cron)</p>
                <p className="italic mb-4">A infraestrutura utiliza o Vercel Cron para execução diária de salvaguarda e validação semanal de integridade.</p>
                <div className="space-y-2">
                  <div className="bg-white/50 border border-[#1e130c]/5 px-3 py-2 flex items-center justify-between">
                    <span className="font-mono text-xs text-[#1e130c] font-bold">0 5 * * *</span>
                    <span className="font-mono text-xs text-[#8b6d22]">/api/admin/backup</span>
                  </div>
                  <div className="bg-white/50 border border-[#1e130c]/5 px-3 py-2 flex items-center justify-between">
                    <span className="font-mono text-xs text-[#1e130c] font-bold">0 6 * * 0</span>
                    <span className="font-mono text-xs text-[#8b6d22]">/api/admin/backup/validate</span>
                  </div>
                </div>
              </div>

              {/* Danger zone */}
              <div className="mt-10 pt-8 border-t-2 border-red-900/10">
                <div className="p-6 border border-red-900/20 bg-red-900/5 space-y-4">
                  <div className="flex items-center gap-3 text-red-900">
                    <AlertTriangle className="w-6 h-6" />
                    <h3 className="font-[family-name:var(--font-playfair)] text-xl font-bold">Expurgo Total de Dados</h3>
                  </div>
                  <p className="text-sm text-[#7a6350] italic leading-relaxed max-w-2xl">
                    Atenção: Esta ação removerá irrevogavelmente o banco de dados operacional, todos os arquivos de armazenamento (storage) e perfis de usuários não-administradores. Apenas as credenciais de administração e os artefatos de instalação básica serão preservados.
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={() => setClearModal({ open: true, password: '', status: 'idle', error: null })}
                      className="px-6 py-3 bg-red-900 text-[#faf6ee] font-bold uppercase tracking-[0.15em] text-[0.65rem] hover:bg-red-800 transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Inicializar Expurgo do Sistema
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Installation Tab */}
        {activeTab === 'installation' && (
          <div className="space-y-8 max-w-3xl">
            <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1e130c] mb-6 pb-2 border-b border-[#1e130c]/5">Diagnóstico de Instalação</h2>
            
            <div className="space-y-6 font-[family-name:var(--font-lora)]">
              <div className="p-6 bg-white/40 border border-[#1e130c]/10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm text-[#7a6350]">
                  <div className="flex flex-col gap-1">
                    <span className="uppercase tracking-widest opacity-60 font-bold text-[0.6rem]">Status Global</span>
                    <span className="text-[#1e130c] font-bold uppercase tracking-wider">{installationState?.installation.status || 'Indisponível'}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="uppercase tracking-widest opacity-60 font-bold text-[0.6rem]">Setup Base</span>
                    <span className="text-[#1e130c] font-bold">{installationState?.installation.isSetupComplete ? 'Concluído' : 'Pendente'}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="uppercase tracking-widest opacity-60 font-bold text-[0.6rem]">Estágio Atual</span>
                    <span className="text-[#1e130c] font-bold capitalize">{installationState?.installation.currentStep || 'Nenhum'}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="uppercase tracking-widest opacity-60 font-bold text-[0.6rem]">Inconsistências</span>
                    <span className={`font-bold ${installationState?.validation.issues.length ? 'text-red-800' : 'text-[#8b6d22]'}`}>
                      {installationState?.validation.issues.length || 0} Registros
                    </span>
                  </div>
                </div>
              </div>

              {installationState?.validation.checks?.length ? (
                <div className="space-y-3">
                  <h4 className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#1e130c] mb-2 pl-1">Verificações de Serviços Internos</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {installationState.validation.checks.map(check => (
                      <div
                        key={check.key}
                        className={`p-4 border text-[0.75rem] flex items-start gap-3 ${
                          check.status === 'ok'
                            ? 'border-[#1e130c]/10 bg-white/40 text-[#1e130c]'
                            : 'border-red-900/20 bg-[#7a6350]/5 text-[#7a6350] italic'
                        }`}
                      >
                        {check.status === 'ok' ? <Check className="w-4 h-4 text-[#8b6d22] flex-shrink-0" /> : <X className="w-4 h-4 flex-shrink-0 text-red-900" />}
                        <span className={check.status === 'ok' ? 'font-bold uppercase tracking-wide' : ''}>{check.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {installationState?.validation.issues && installationState.validation.issues.length > 0 && (
                <div className="p-5 border border-red-900/20 bg-[#7a6350]/5 space-y-2 mt-6">
                  <p className="font-bold text-red-900 uppercase text-[0.65rem] tracking-widest mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Alertas Críticos Identificados
                  </p>
                  <ul className="list-disc list-inside text-sm text-[#7a6350] italic space-y-1 ml-2">
                    {installationState.validation.issues.map(issue => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              {installationValidationState.status === 'error' && installationValidationState.error && (
                <div className="p-4 border border-red-900/20 bg-[#7a6350]/5 text-sm text-[#7a6350] italic mt-4">
                  {installationValidationState.error}
                </div>
              )}

              {installationValidationState.status === 'success' && (
                <div className="p-4 border border-[#8b6d22]/30 bg-white/40 text-[0.75rem] font-bold text-[#1e130c] uppercase tracking-wider flex items-center gap-3 mt-4">
                  <Check className="w-4 h-4 text-[#8b6d22]" />
                  Serviços e integrações revalidados com sucesso.
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 pt-8 mt-4 border-t border-[#1e130c]/10">
                <button
                  onClick={handleInstallationValidation}
                  disabled={installationValidationState.status === 'running'}
                  className="flex-1 py-3 border border-[#1e130c]/20 text-[#1e130c] font-bold uppercase tracking-[0.15em] text-[0.65rem] hover:bg-[#1e130c]/5 transition-colors disabled:opacity-30 flex items-center justify-center gap-2"
                >
                  {installationValidationState.status === 'running' ? <Loader2 className="w-4 h-4 animate-spin" /> : <SettingsIcon className="w-4 h-4" />}
                  {installationValidationState.status === 'running' ? 'Diagnosticando...' : 'Revalidar Serviços'}
                </button>

                <a
                  href="/setup"
                  className="flex-1 py-3 bg-[#1e130c] text-[#faf6ee] font-bold uppercase tracking-[0.15em] text-[0.65rem] hover:bg-[#8b6d22] transition-colors flex items-center justify-center gap-2 text-center"
                >
                  Acessar Wizard de Setup
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* System Info Footnote */}
      <div className="mt-8 pt-6 border-t border-[#1e130c]/10 grid grid-cols-1 sm:grid-cols-3 gap-6 font-[family-name:var(--font-lora)] px-2 opacity-80 hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-3">
          <Globe className="w-4 h-4 text-[#8b6d22]" />
          <div>
            <p className="text-[0.6rem] font-bold uppercase tracking-widest text-[#7a6350]">Versão do Core</p>
            <p className="text-sm text-[#1e130c] font-mono font-bold mt-0.5">{versionInfo?.version || '1.0.0'}</p>
            {versionInfo?.gitHash && versionInfo.gitHash !== 'unknown' && (
              <p className="text-[0.6rem] text-[#7a6350] font-mono mt-0.5">SHA: {versionInfo.gitHash.substring(0, 7)}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <DatabaseIcon className="w-4 h-4 text-[#8b6d22]" />
          <div>
            <p className="text-[0.6rem] font-bold uppercase tracking-widest text-[#7a6350]">Infraestrutura de Dados</p>
            <p className="text-sm text-[#1e130c] font-bold mt-0.5">Supabase</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Shield className="w-4 h-4 text-[#8b6d22]" />
          <div>
            <p className="text-[0.6rem] font-bold uppercase tracking-widest text-[#7a6350]">Última Compilação</p>
            <p className="text-xs text-[#1e130c] font-mono mt-1 font-bold">
              {versionInfo?.gitDate
                ? new Date(versionInfo.gitDate).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                : new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
      </div>

      {/* Restore confirmation modal (Renaissance Style) */}
      {restoreModal.open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#1e130c]/40 backdrop-blur-sm p-4">
          <div className="bg-[#faf6ee] border border-[#1e130c]/20 w-full max-w-lg shadow-2xl p-8 font-[family-name:var(--font-lora)] animate-in fade-in zoom-in duration-300">
            <div className="flex items-center gap-3 mb-6 border-b border-[#1e130c]/10 pb-4">
              <AlertTriangle className="w-6 h-6 text-red-900" />
              <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1e130c]">Aviso de Sobrescrita</h2>
            </div>

            <div className="text-sm text-[#1e130c] space-y-4 mb-8">
              <p className="leading-relaxed">
                Você está prestes a substituir os dados operacionais atuais pelo registro fotográfico <span className="font-mono font-bold bg-[#1e130c]/5 px-1.5 py-0.5">{selectedBackupId}</span>.
              </p>
              <p className="italic text-[#7a6350]">Recomenda-se executar esta operação estritamente em janelas de manutenção.</p>

              <div className="grid grid-cols-2 gap-4 pt-4 mt-4 border-t border-[#1e130c]/5">
                <div className="bg-white/50 border border-[#1e130c]/5 p-3">
                  <p className="text-[0.6rem] font-bold uppercase tracking-widest text-[#7a6350] mb-1">Banco Relacional</p>
                  <p className="text-[#1e130c] font-bold uppercase text-xs">{restoreOptions.restoreDatabase ? 'Autorizado' : 'Ignorado'}</p>
                </div>
                <div className="bg-white/50 border border-[#1e130c]/5 p-3">
                  <p className="text-[0.6rem] font-bold uppercase tracking-widest text-[#7a6350] mb-1">Repositório de Arquivos</p>
                  <p className="text-[#1e130c] font-bold uppercase text-xs">{restoreOptions.restoreStorage ? 'Autorizado' : 'Ignorado'}</p>
                </div>
              </div>
            </div>

            {restoreModal.error && (
              <div className="mb-6 p-4 border border-red-900/20 bg-[#7a6350]/5 text-sm text-[#7a6350] italic flex items-start gap-3">
                <X className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-900" />
                <span>{restoreModal.error}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-[#1e130c]/10">
              <button
                onClick={() => setRestoreModal({ open: false, status: 'idle', error: null })}
                disabled={restoreModal.status === 'running'}
                className="flex-1 py-3 border border-[#1e130c]/20 text-[#1e130c] font-bold uppercase tracking-[0.15em] text-[0.65rem] hover:bg-[#1e130c]/5 transition-colors disabled:opacity-30"
              >
                Abortar Operação
              </button>
              <button
                onClick={handleBackupRestore}
                disabled={restoreModal.status === 'running'}
                className="flex-2 py-3 bg-red-900 text-[#faf6ee] font-bold uppercase tracking-[0.15em] text-[0.65rem] hover:bg-red-950 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 px-6"
              >
                {restoreModal.status === 'running' ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                {restoreModal.status === 'running' ? 'Aplicando Imagem...' : 'Confirmar Sobrescrita'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear data confirmation modal (Renaissance Style) */}
      {clearModal.open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#1e130c]/60 backdrop-blur-sm p-4">
          <div className="bg-[#faf6ee] border-t-4 border-red-900 w-full max-w-md shadow-2xl p-8 font-[family-name:var(--font-lora)] animate-in fade-in zoom-in duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-red-900/10 flex items-center justify-center border border-red-900/20">
                <AlertTriangle className="w-6 h-6 text-red-900" />
              </div>
              <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1e130c]">Expurgo Geral</h2>
            </div>

            {clearModal.status === 'success' ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 bg-[#1e130c]/5 mx-auto flex items-center justify-center border border-[#1e130c]/10 rounded-full">
                  <Check className="w-8 h-8 text-[#8b6d22]" />
                </div>
                <p className="text-lg font-bold text-[#1e130c]">Sistema Limpo e Reinicializado.</p>
                <button
                  onClick={() => setClearModal({ open: false, password: '', status: 'idle', error: null })}
                  className="mt-6 w-full py-3 bg-[#1e130c] text-[#faf6ee] font-bold uppercase tracking-[0.2em] text-[0.65rem] hover:bg-[#8b6d22] transition-colors"
                >
                  Fechar Painel
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm text-[#1e130c] leading-relaxed mb-6">
                  Esta diretiva instrui o servidor a obliterar todas as tabelas operacionais e acervos de arquivos. Assinatura administrativa exigida para prosseguir.
                </p>

                {clearModal.error && (
                  <div className="mb-6 p-4 border border-red-900/20 bg-[#7a6350]/5 text-sm text-[#7a6350] italic flex items-center gap-3">
                    <X className="w-4 h-4 flex-shrink-0 text-red-900" />
                    {clearModal.error}
                  </div>
                )}

                <div className="mb-8">
                  <label className="block text-[0.65rem] font-bold uppercase text-[#7a6350] tracking-[0.2em] mb-2">
                    Credencial do Administrador
                  </label>
                  <div className="relative">
                    <Key className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-red-900 opacity-70" />
                    <input
                      type="password"
                      value={clearModal.password}
                      onChange={e => setClearModal(prev => ({ ...prev, password: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && clearModal.password && handleClearData()}
                      autoFocus
                      className="w-full pl-7 pr-0 py-2 bg-transparent border-0 border-b-2 border-[#1e130c]/30 text-[#1e130c] focus:ring-0 focus:border-red-900 transition-colors rounded-none font-mono tracking-widest text-lg"
                      placeholder="••••••••"
                      disabled={clearModal.status === 'running'}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => setClearModal({ open: false, password: '', status: 'idle', error: null })}
                    className="flex-1 py-3 border border-[#1e130c]/20 text-[#1e130c] font-bold uppercase tracking-[0.15em] text-[0.65rem] hover:bg-[#1e130c]/5 transition-colors disabled:opacity-30"
                    disabled={clearModal.status === 'running'}
                  >
                    Recuar
                  </button>
                  <button
                    onClick={handleClearData}
                    disabled={!clearModal.password || clearModal.status === 'running'}
                    className="flex-2 py-3 bg-red-900 text-[#faf6ee] font-bold uppercase tracking-[0.15em] text-[0.65rem] hover:bg-red-950 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 px-6"
                  >
                    {clearModal.status === 'running' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    {clearModal.status === 'running' ? 'Obliterando...' : 'Autorizar Expurgo'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
