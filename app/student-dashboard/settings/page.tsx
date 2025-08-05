'use client'

import { useState, useEffect } from 'react'
import { User, Lock, Globe, Bell, Shield, Save, Check, AlertCircle, Moon, Sun, Download, Trash2, Camera, Upload } from 'lucide-react'
import Card from '../../components/Card'
import Button from '../../components/Button'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '../../contexts/LanguageContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useRouter } from 'next/navigation'

interface ProfileForm {
  full_name: string
  email: string
  phone: string
  bio: string
  avatar_url?: string
}

interface PasswordForm {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

interface PreferencesForm {
  theme: 'light' | 'dark'
  language: 'pt-BR' | 'en-US' | 'es-ES'
  emailNotifications: boolean
  pushNotifications: boolean
  weeklyReports: boolean
}

export default function StudentSettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'preferences' | 'privacy'>('profile')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const { t, language, setLanguage } = useTranslation()
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const supabase = createClient()

  // Forms
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    full_name: '',
    email: '',
    phone: '',
    bio: '',
    avatar_url: ''
  })

  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const [preferencesForm, setPreferencesForm] = useState<PreferencesForm>({
    theme: theme as 'light' | 'dark',
    language: language,
    emailNotifications: true,
    pushNotifications: false,
    weeklyReports: true
  })

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile) {
        setProfileForm({
          full_name: profile.full_name || '',
          email: profile.email,
          phone: profile.phone || '',
          bio: profile.bio || '',
          avatar_url: profile.avatar_url || ''
        })
      }

      // Load preferences from localStorage or database
      const savedPreferences = localStorage.getItem('userPreferences')
      if (savedPreferences) {
        const prefs = JSON.parse(savedPreferences)
        setPreferencesForm(prev => ({ ...prev, ...prefs }))
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setLoading(false)
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return
    
    const file = e.target.files[0]
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    
    // Validate file type
    const validTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp']
    if (!fileExt || !validTypes.includes(fileExt.toLowerCase())) {
      setMessage({ type: 'error', text: 'Por favor, selecione uma imagem válida (jpg, png, gif, webp)' })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'A imagem deve ter no máximo 5MB' })
      return
    }
    
    setUploadingAvatar(true)
    setMessage(null)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not found')
      
      // Upload image to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('avatars')
        .upload(`${user.id}/${fileName}`, file, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (uploadError) throw uploadError
      
      // Get public URL
      const { data: { publicUrl } } = supabase
        .storage
        .from('avatars')
        .getPublicUrl(`${user.id}/${fileName}`)
      
      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
      
      if (updateError) throw updateError
      
      // Update local state
      setProfileForm(prev => ({ ...prev, avatar_url: publicUrl }))
      setMessage({ type: 'success', text: 'Foto atualizada com sucesso!' })
      
      // Delete old avatar if exists
      if (profileForm.avatar_url && profileForm.avatar_url.includes('supabase')) {
        const oldPath = profileForm.avatar_url.split('/').slice(-2).join('/')
        await supabase.storage.from('avatars').remove([oldPath])
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao fazer upload da imagem' })
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not found')

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileForm.full_name,
          phone: profileForm.phone,
          bio: profileForm.bio,
          avatar_url: profileForm.avatar_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error

      setMessage({ type: 'success', text: t('settings.profileUpdated') })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || t('settings.profileUpdateError') })
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: t('settings.passwordMismatch') })
      setSaving(false)
      return
    }

    if (passwordForm.newPassword.length < 6) {
      setMessage({ type: 'error', text: t('settings.minCharacters') })
      setSaving(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      })

      if (error) throw error

      setMessage({ type: 'success', text: t('settings.passwordUpdated') })
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || t('settings.passwordUpdateError') })
    } finally {
      setSaving(false)
    }
  }

  const handlePreferencesSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      // Save preferences
      localStorage.setItem('userPreferences', JSON.stringify(preferencesForm))
      
      // Apply theme and language changes
      setTheme(preferencesForm.theme)
      setLanguage(preferencesForm.language)

      setMessage({ type: 'success', text: t('settings.preferencesUpdated') })
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Erro ao salvar preferências' })
    } finally {
      setSaving(false)
    }
  }

  const handleExportData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch all user data
      const [profile, enrollments, progress, activities] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('enrollments').select('*, course:courses(title)').eq('user_id', user.id),
        supabase.from('lesson_progress').select('*').eq('user_id', user.id),
        supabase.from('activity_logs').select('*').eq('user_id', user.id)
      ])

      const userData = {
        profile: profile.data,
        enrollments: enrollments.data,
        progress: progress.data,
        activities: activities.data,
        exportedAt: new Date().toISOString()
      }

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `swiftedu-data-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setMessage({ type: 'success', text: 'Dados exportados com sucesso!' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao exportar dados' })
    }
  }

  const tabs = [
    { id: 'profile', label: t('settings.profileSettings'), icon: User },
    { id: 'password', label: t('settings.changePassword'), icon: Lock },
    { id: 'preferences', label: t('settings.preferencesSettings'), icon: Globe },
    { id: 'privacy', label: 'Privacidade e Dados', icon: Shield }
  ]

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gold">{t('settings.title')}</h1>
        <p className="text-gold-300 mt-1">{t('settings.subtitle')}</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gold-500/20 pb-2">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === tab.id 
                  ? 'bg-gold-500/20 text-gold border-b-2 border-gold-500' 
                  : 'text-gold-300 hover:text-gold hover:bg-navy-800/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-green-500/20 text-green-400 border border-green-500/20' 
            : 'bg-red-500/20 text-red-400 border border-red-500/20'
        }`}>
          {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <Card 
          title={t('settings.profileSettings')}
          subtitle={t('settings.profileInfo')}
        >
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            {/* Avatar Upload */}
            <div className="flex items-center gap-6 mb-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-navy-900/50 border-2 border-gold-500/20">
                  {profileForm.avatar_url ? (
                    <img 
                      src={profileForm.avatar_url} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-12 h-12 text-gold-500/50" />
                    </div>
                  )}
                </div>
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-navy-900/80 rounded-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500"></div>
                  </div>
                )}
                <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-gold-500 hover:bg-gold-600 text-navy-900 rounded-full p-2 cursor-pointer transition-colors">
                  <Camera className="w-4 h-4" />
                  <input
                    type="file"
                    id="avatar-upload"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    disabled={uploadingAvatar}
                  />
                </label>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gold mb-1">Foto do Perfil</h3>
                <p className="text-sm text-gold-300 mb-3">
                  Clique no ícone da câmera para alterar sua foto. 
                  Formatos aceitos: JPG, PNG, GIF, WEBP (máx. 5MB)
                </p>
                {profileForm.avatar_url && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setProfileForm(prev => ({ ...prev, avatar_url: '' }))
                      setMessage({ type: 'success', text: 'Foto removida. Salve para confirmar.' })
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remover Foto
                  </Button>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gold-200 mb-1">
                {t('settings.fullName')}
              </label>
              <input
                type="text"
                id="full_name"
                value={profileForm.full_name}
                onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                placeholder="Seu nome completo"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gold-200 mb-1">
                {t('settings.email')}
              </label>
              <input
                type="email"
                id="email"
                value={profileForm.email}
                disabled
                className="w-full px-4 py-2 bg-navy-900/30 border border-gold-500/10 rounded-lg text-gold-300 cursor-not-allowed"
              />
              <p className="text-xs text-gold-400 mt-1">{t('settings.emailCannotChange')}</p>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gold-200 mb-1">
                {t('settings.phone')}
              </label>
              <input
                type="tel"
                id="phone"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: formatPhone(e.target.value) })}
                className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                placeholder={t('settings.phonePlaceholder')}
              />
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gold-200 mb-1">
                {t('settings.bio')}
              </label>
              <textarea
                id="bio"
                value={profileForm.bio}
                onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent resize-none"
                placeholder={t('settings.bioPlaceholder')}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? t('settings.saving') : t('settings.saveChanges')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <Card 
          title={t('settings.changePassword')}
          subtitle={t('settings.passwordInfo')}
        >
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gold-200 mb-1">
                {t('settings.currentPassword')}
              </label>
              <input
                type="password"
                id="currentPassword"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gold-200 mb-1">
                {t('settings.newPassword')}
              </label>
              <input
                type="password"
                id="newPassword"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                placeholder="••••••••"
                required
                minLength={6}
              />
              <p className="text-xs text-gold-400 mt-1">{t('settings.minCharacters')}</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gold-200 mb-1">
                {t('settings.confirmNewPassword')}
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 placeholder-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                <Lock className="w-4 h-4 mr-2" />
                {saving ? t('settings.updating') : t('settings.updatePassword')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <Card 
          title={t('settings.preferencesSettings')}
          subtitle={t('settings.customizeExperience')}
        >
          <form onSubmit={handlePreferencesSubmit} className="space-y-6">
            {/* Theme */}
            <div>
              <label className="block text-sm font-medium text-gold-200 mb-3">
                {t('settings.theme')}
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setPreferencesForm({ ...preferencesForm, theme: 'light' })}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    preferencesForm.theme === 'light'
                      ? 'border-gold-500 bg-gold-500/20'
                      : 'border-gold-500/20 hover:border-gold-500/40'
                  }`}
                >
                  <Sun className="w-8 h-8 text-gold mx-auto mb-2" />
                  <p className="text-gold-200">{t('settings.themeLight')}</p>
                </button>
                
                <button
                  type="button"
                  onClick={() => setPreferencesForm({ ...preferencesForm, theme: 'dark' })}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    preferencesForm.theme === 'dark'
                      ? 'border-gold-500 bg-gold-500/20'
                      : 'border-gold-500/20 hover:border-gold-500/40'
                  }`}
                >
                  <Moon className="w-8 h-8 text-gold mx-auto mb-2" />
                  <p className="text-gold-200">{t('settings.themeDark')}</p>
                </button>
              </div>
            </div>

            {/* Language */}
            <div>
              <label htmlFor="language" className="block text-sm font-medium text-gold-200 mb-1">
                {t('settings.language')}
              </label>
              <select
                id="language"
                value={preferencesForm.language}
                onChange={(e) => setPreferencesForm({ ...preferencesForm, language: e.target.value as any })}
                className="w-full px-4 py-2 bg-navy-900/50 border border-gold-500/20 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
              >
                <option value="pt-BR">Português (BR)</option>
                <option value="en-US">English (US)</option>
                <option value="es-ES">Español (ES)</option>
              </select>
            </div>

            {/* Notifications */}
            <div>
              <label className="block text-sm font-medium text-gold-200 mb-3">
                {t('settings.notifications')}
              </label>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferencesForm.emailNotifications}
                    onChange={(e) => setPreferencesForm({ ...preferencesForm, emailNotifications: e.target.checked })}
                    className="w-4 h-4 text-gold-500 bg-navy-900/50 border-gold-500/20 rounded focus:ring-gold-500"
                  />
                  <span className="text-gold-200">{t('settings.emailNotifications')}</span>
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferencesForm.pushNotifications}
                    onChange={(e) => setPreferencesForm({ ...preferencesForm, pushNotifications: e.target.checked })}
                    className="w-4 h-4 text-gold-500 bg-navy-900/50 border-gold-500/20 rounded focus:ring-gold-500"
                  />
                  <span className="text-gold-200">Notificações Push</span>
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferencesForm.weeklyReports}
                    onChange={(e) => setPreferencesForm({ ...preferencesForm, weeklyReports: e.target.checked })}
                    className="w-4 h-4 text-gold-500 bg-navy-900/50 border-gold-500/20 rounded focus:ring-gold-500"
                  />
                  <span className="text-gold-200">Relatórios Semanais de Progresso</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? t('settings.saving') : t('settings.saveChanges')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Privacy Tab */}
      {activeTab === 'privacy' && (
        <div className="space-y-6">
          <Card 
            title="Privacidade e Dados"
            subtitle="Gerencie suas informações pessoais e privacidade"
          >
            <div className="space-y-6">
              <div className="bg-navy-900/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gold mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Seus Dados
                </h3>
                <p className="text-gold-300 mb-4">
                  Suas informações são protegidas e armazenadas com segurança. 
                  Você tem controle total sobre seus dados pessoais.
                </p>
                <div className="space-y-3">
                  <Button
                    variant="secondary"
                    onClick={handleExportData}
                    className="w-full sm:w-auto"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Exportar Meus Dados
                  </Button>
                  
                  <p className="text-sm text-gold-400">
                    Baixe uma cópia de todos os seus dados em formato JSON
                  </p>
                </div>
              </div>

              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-red-400 mb-3 flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                  Zona de Perigo
                </h3>
                <p className="text-gold-300 mb-4">
                  Ações irreversíveis. Por favor, tenha certeza antes de prosseguir.
                </p>
                <Button
                  variant="secondary"
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/20"
                  onClick={() => {
                    if (confirm('Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.')) {
                      // Implementar exclusão de conta
                      alert('Funcionalidade em desenvolvimento')
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir Minha Conta
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gold">Política de Privacidade</h3>
              <div className="space-y-3 text-gold-300">
                <p>
                  <strong className="text-gold">1. Coleta de Dados:</strong> Coletamos apenas as informações 
                  necessárias para fornecer nossos serviços educacionais.
                </p>
                <p>
                  <strong className="text-gold">2. Uso dos Dados:</strong> Seus dados são usados exclusivamente 
                  para melhorar sua experiência de aprendizado e nunca são vendidos a terceiros.
                </p>
                <p>
                  <strong className="text-gold">3. Segurança:</strong> Utilizamos criptografia e as melhores 
                  práticas de segurança para proteger suas informações.
                </p>
                <p>
                  <strong className="text-gold">4. Seus Direitos:</strong> Você tem o direito de acessar, 
                  corrigir ou excluir seus dados a qualquer momento.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}