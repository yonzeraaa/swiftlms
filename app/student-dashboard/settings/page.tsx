'use client'

import { useState, useEffect } from 'react'
import { User, Lock, Globe, Shield, Save, Camera, Settings, Mail, Phone, Info } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getUserProfile, updateUserProfile, uploadAvatar, deleteOldAvatar } from '@/lib/actions/student-settings'
import { ClassicRule, CornerBracket } from '../../components/ui/RenaissanceSvgs'
import Spinner from '../../components/ui/Spinner'

const INK = '#1e130c'
const ACCENT = '#8b6d22'
const MUTED = '#7a6350'
const PARCH = '#faf6ee'
const BORDER = 'rgba(30,19,12,0.14)'

interface ProfileForm {
  full_name: string
  email: string
  phone: string
  bio: string
  avatar_url?: string
}

function SkeletonBlock({ height = 20, width = '100%', style }: { height?: number; width?: string | number; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        height,
        width,
        backgroundColor: 'rgba(30,19,12,0.06)',
        borderRadius: 0,
        animation: 'pulse 1.5s ease-in-out infinite',
        ...style,
      }}
    />
  )
}

export default function StudentSettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'preferences'>('profile')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const router = useRouter()
  const [profileForm, setProfileForm] = useState<ProfileForm>({ full_name: '', email: '', phone: '', bio: '', avatar_url: '' })

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      const profile = await getUserProfile()
      if (!profile) { router.push('/'); return; }
      setProfileForm(profile)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const result = await updateUserProfile({ full_name: profileForm.full_name, phone: profileForm.phone, bio: profileForm.bio, avatar_url: profileForm.avatar_url })
      if (!result.success) throw new Error(result.error)
      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao salvar.' })
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return
    setUploadingAvatar(true)
    try {
      const file = e.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const fileBuffer = await file.arrayBuffer()
      const result = await uploadAvatar({ fileName, fileBuffer, contentType: file.type })
      if (!result.success) throw new Error(result.error)
      if (profileForm.avatar_url?.includes('supabase')) await deleteOldAvatar(profileForm.avatar_url)
      setProfileForm(prev => ({ ...prev, avatar_url: result.publicUrl }))
      setMessage({ type: 'success', text: 'Imagem atualizada!' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setUploadingAvatar(false)
    }
  }

  if (loading) {
    return <Spinner fullPage size="xl" />
  }

  return (
    <div className="flex flex-col">
      <div className="text-center flex flex-col items-center mb-12">
        <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: '2.5rem', fontWeight: 700, color: INK, marginBottom: '0.5rem' }}>
          Configurações Pessoais
        </h1>
        <p style={{ fontFamily: 'var(--font-lora)', fontSize: '1.1rem', fontStyle: 'italic', color: MUTED }}>
          Gerencie sua identidade e preferências no ecossistema Swift
        </p>
        <ClassicRule style={{ width: '100%', maxWidth: '300px', marginTop: '2.5rem', color: INK }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        {/* Navegação Lateral */}
        <div className="lg:col-span-1 space-y-2">
          {[
            { id: 'profile', label: 'Perfil do Aluno', icon: User },
            { id: 'password', label: 'Segurança', icon: Lock },
            { id: 'preferences', label: 'Preferências', icon: Globe }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className="w-full text-left py-3 px-4 transition-all"
              style={{
                background: activeTab === tab.id ? 'rgba(30,19,12,0.04)' : 'none',
                border: 'none',
                borderLeft: activeTab === tab.id ? `3px solid ${ACCENT}` : '3px solid transparent',
                color: activeTab === tab.id ? INK : MUTED,
                fontFamily: 'var(--font-lora)',
                fontWeight: activeTab === tab.id ? 700 : 400,
                cursor: 'pointer'
              }}
            >
              <tab.icon size={16} className="inline mr-3 opacity-50" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Formulário Principal */}
        <div className="lg:col-span-3">
          <div style={{ backgroundColor: PARCH, border: `1px solid ${BORDER}`, padding: '3rem', position: 'relative' }}>
            <div className="absolute top-4 left-4 w-8 h-8"><CornerBracket size={32} /></div>
            
            {message && (
              <div style={{ padding: '1rem', marginBottom: '2rem', backgroundColor: 'rgba(30,19,12,0.02)', border: `1px solid ${message.type === 'success' ? INK : MUTED}`, color: message.type === 'success' ? INK : MUTED, fontSize: '0.85rem', fontFamily: 'var(--font-lora)' }}>
                {message.text}
              </div>
            )}

            {activeTab === 'profile' && (
              <form onSubmit={handleProfileSubmit} className="space-y-8">
                <div className="flex items-center gap-8 mb-12">
                  <div className="relative">
                    <div style={{ width: '100px', height: '100px', backgroundColor: '#f0e6d2', border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
                      {profileForm.avatar_url ? <img src={profileForm.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[#7a6350]"><User size={40} /></div>}
                    </div>
                    <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#1e130c] text-[#faf6ee] flex items-center justify-center cursor-pointer hover:bg-[#8b6d22] transition-colors shadow-lg">
                      <Camera size={14} />
                      <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                    </label>
                  </div>
                  <div>
                    <h4 style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.2rem', color: INK }}>Foto de Identificação</h4>
                    <p style={{ fontSize: '0.8rem', color: MUTED, fontStyle: 'italic' }}>Recomendado: Imagem quadrada, máx. 5MB</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col">
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: MUTED, marginBottom: '0.5rem' }}>Nome Completo</label>
                    <input
                      type="text"
                      value={profileForm.full_name}
                      onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                      style={{ padding: '0.75rem', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, color: INK, fontFamily: 'var(--font-lora)' }}
                    />
                  </div>
                  <div className="flex flex-col">
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: MUTED, marginBottom: '0.5rem' }}>Email Institucional</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      disabled
                      style={{ padding: '0.75rem', backgroundColor: 'rgba(30,19,12,0.04)', border: `1px solid ${BORDER}`, color: MUTED, fontFamily: 'var(--font-lora)', cursor: 'not-allowed' }}
                    />
                  </div>
                </div>

                <div className="flex flex-col">
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: MUTED, marginBottom: '0.5rem' }}>Telefone de Contato</label>
                  <input
                    type="text"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    style={{ padding: '0.75rem', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, color: INK, fontFamily: 'var(--font-lora)' }}
                  />
                </div>

                <div className="flex flex-col">
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: MUTED, marginBottom: '0.5rem' }}>Resumo Biográfico</label>
                  <textarea
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                    style={{ padding: '0.75rem', backgroundColor: 'transparent', border: `1px solid ${BORDER}`, color: INK, fontFamily: 'var(--font-lora)', minHeight: '120px' }}
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    style={{ padding: '1rem 3rem', backgroundColor: INK, color: PARCH, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-lora)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em' }}
                  >
                    {saving ? 'Gravando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </form>
            )}

            {activeTab !== 'profile' && (
              <div className="py-20 text-center italic text-[#7a6350]">
                Funcionalidade de {activeTab === 'password' ? 'segurança' : 'preferências'} está sendo refinada para o novo padrão visual.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
