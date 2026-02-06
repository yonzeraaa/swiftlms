'use client'

import { useState } from 'react'
import { X, Check, AlertCircle } from 'lucide-react'
import { useTranslation } from '../contexts/LanguageContext'
import Button from './Button'
import { Playfair_Display } from 'next/font/google'

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
})

function ModalDivider({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 20" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="0" y1="10" x2="120" y2="10" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
      <line x1="180" y1="10" x2="300" y2="10" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
      <path
        d="M130 10 C135 5 140 3 150 3 C160 3 165 5 170 10 C165 15 160 17 150 17 C140 17 135 15 130 10Z"
        stroke="currentColor" strokeWidth="0.8" opacity="0.5" fill="currentColor" fillOpacity="0.1"
      />
      <circle cx="150" cy="10" r="2" fill="currentColor" opacity="0.6" />
    </svg>
  )
}

function CornerFlourish({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 5 C5 5 15 5 25 15 C35 25 30 40 20 35 C10 30 15 20 25 15" stroke="currentColor" strokeWidth="1" opacity="0.5" fill="none" />
      <path d="M5 5 C5 5 5 15 15 25 C25 35 40 30 35 20 C30 10 20 15 15 25" stroke="currentColor" strokeWidth="1" opacity="0.5" fill="none" />
      <circle cx="5" cy="5" r="2" fill="currentColor" opacity="0.6" />
    </svg>
  )
}

interface ContactModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    courseInterest: '',
    message: ''
  })
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errors, setErrors] = useState<Record<string, string>>({})

  if (!isOpen) return null

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = t('validation.required')
    }

    if (!formData.email.trim()) {
      newErrors.email = t('validation.required')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('validation.email')
    }

    if (!formData.message.trim()) {
      newErrors.message = t('validation.required')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    const subject = `Contato via SwiftEDU - ${formData.name}`
    const body = `Nome: ${formData.name}
Email: ${formData.email}${formData.courseInterest ? `
Interesse em Curso: ${formData.courseInterest}` : ''}

Mensagem:
${formData.message}

---
Esta mensagem foi enviada através do formulário de contato do sistema SwiftEDU.`

    const mailtoLink = `mailto:iqmasetti@masetti.net?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

    window.open(mailtoLink, '_blank')

    setSubmitStatus('success')
    setFormData({ name: '', email: '', courseInterest: '', message: '' })
    setTimeout(() => {
      onClose()
      setSubmitStatus('idle')
    }, 2000)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
      <div className="relative max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        style={{
          background: 'linear-gradient(170deg, #1a1410 0%, #15110c 50%, #1a1410 100%)',
          border: '1px solid rgba(201,168,76,0.15)',
        }}
      >
        {/* Moldura interna */}
        <div className="absolute inset-3 pointer-events-none" style={{ border: '1px solid rgba(201,168,76,0.07)' }} />

        {/* Textura de pergaminho */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(201,168,76,0.15) 28px, rgba(201,168,76,0.15) 29px)' }}
        />

        {/* Flourishes nos cantos */}
        <CornerFlourish className="absolute top-1 left-1 w-8 h-8 text-[#c9a84c] opacity-30" />
        <CornerFlourish className="absolute top-1 right-1 w-8 h-8 text-[#c9a84c] opacity-30 -scale-x-100" />
        <CornerFlourish className="absolute bottom-1 left-1 w-8 h-8 text-[#c9a84c] opacity-30 -scale-y-100" />
        <CornerFlourish className="absolute bottom-1 right-1 w-8 h-8 text-[#c9a84c] opacity-30 -scale-x-100 -scale-y-100" />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between p-6 pb-4">
          <div>
            <h2 className={`${playfair.className} text-xl font-medium italic`} style={{ color: '#e8dcc8' }}>
              {t('contact.title')}
            </h2>
            <p className="text-sm mt-1 font-light" style={{ color: '#8b7355' }}>
              {t('contact.subtitle')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="transition-colors hover:text-[#c9a84c]"
            style={{ color: '#8b7355' }}
            aria-label={t('contact.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6">
          <ModalDivider className="w-full text-[#c9a84c] opacity-60" />
        </div>

        {/* Content */}
        <div className="relative z-10 p-6 pt-4">
          {submitStatus === 'success' ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
                style={{ border: '1px solid rgba(201,168,76,0.3)', background: 'rgba(201,168,76,0.08)' }}
              >
                <Check className="w-7 h-7" style={{ color: '#c9a84c' }} />
              </div>
              <div>
                <h3 className={`${playfair.className} text-lg font-medium italic mb-2`} style={{ color: '#c9a84c' }}>
                  {t('contact.success')}
                </h3>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name Field */}
              <div className="group/input">
                <label htmlFor="contact-name"
                  className="block text-xs mb-2 transition-colors group-focus-within/input:text-[#c9a84c]"
                  style={{ fontVariant: 'small-caps', letterSpacing: '0.2em', color: '#8b7355' }}
                >
                  {t('contact.name')} <span style={{ color: '#6b1d1d' }}>*</span>
                </label>
                <input
                  type="text"
                  id="contact-name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full bg-transparent border-0 border-b py-2.5 px-1 text-base outline-none transition-all duration-300 font-light"
                  style={{
                    borderBottomWidth: '1px',
                    borderBottomColor: errors.name ? '#6b1d1d' : 'rgba(139,115,85,0.3)',
                    color: '#e8dcc8',
                  }}
                  placeholder={t('contact.namePlaceholder')}
                />
                {errors.name && (
                  <div className="flex items-center gap-2 mt-2 py-1.5 px-3"
                    style={{ borderLeft: '2px solid #6b1d1d', background: 'rgba(107,29,29,0.1)' }}
                  >
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#c75050' }} />
                    <p className="text-xs" style={{ color: '#c75050' }}>{errors.name}</p>
                  </div>
                )}
              </div>

              {/* Email Field */}
              <div className="group/input">
                <label htmlFor="contact-email"
                  className="block text-xs mb-2 transition-colors group-focus-within/input:text-[#c9a84c]"
                  style={{ fontVariant: 'small-caps', letterSpacing: '0.2em', color: '#8b7355' }}
                >
                  {t('contact.email')} <span style={{ color: '#6b1d1d' }}>*</span>
                </label>
                <input
                  type="email"
                  id="contact-email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full bg-transparent border-0 border-b py-2.5 px-1 text-base outline-none transition-all duration-300 font-light"
                  style={{
                    borderBottomWidth: '1px',
                    borderBottomColor: errors.email ? '#6b1d1d' : 'rgba(139,115,85,0.3)',
                    color: '#e8dcc8',
                  }}
                  placeholder={t('contact.emailPlaceholder')}
                />
                {errors.email && (
                  <div className="flex items-center gap-2 mt-2 py-1.5 px-3"
                    style={{ borderLeft: '2px solid #6b1d1d', background: 'rgba(107,29,29,0.1)' }}
                  >
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#c75050' }} />
                    <p className="text-xs" style={{ color: '#c75050' }}>{errors.email}</p>
                  </div>
                )}
              </div>

              {/* Course Interest Field */}
              <div className="group/input">
                <label htmlFor="contact-course"
                  className="block text-xs mb-2 transition-colors group-focus-within/input:text-[#c9a84c]"
                  style={{ fontVariant: 'small-caps', letterSpacing: '0.2em', color: '#8b7355' }}
                >
                  {t('contact.courseInterest')}
                </label>
                <input
                  type="text"
                  id="contact-course"
                  value={formData.courseInterest}
                  onChange={(e) => handleInputChange('courseInterest', e.target.value)}
                  className="w-full bg-transparent border-0 border-b py-2.5 px-1 text-base outline-none transition-all duration-300 font-light"
                  style={{
                    borderBottomWidth: '1px',
                    borderBottomColor: 'rgba(139,115,85,0.3)',
                    color: '#e8dcc8',
                  }}
                  placeholder={t('contact.courseInterestPlaceholder')}
                />
              </div>

              {/* Message Field */}
              <div className="group/input">
                <label htmlFor="contact-message"
                  className="block text-xs mb-2 transition-colors group-focus-within/input:text-[#c9a84c]"
                  style={{ fontVariant: 'small-caps', letterSpacing: '0.2em', color: '#8b7355' }}
                >
                  {t('contact.message')} <span style={{ color: '#6b1d1d' }}>*</span>
                </label>
                <textarea
                  id="contact-message"
                  value={formData.message}
                  onChange={(e) => handleInputChange('message', e.target.value)}
                  rows={4}
                  className="w-full bg-transparent border-0 border-b py-2.5 px-1 text-base outline-none transition-all duration-300 font-light resize-none"
                  style={{
                    borderBottomWidth: '1px',
                    borderBottomColor: errors.message ? '#6b1d1d' : 'rgba(139,115,85,0.3)',
                    color: '#e8dcc8',
                  }}
                  placeholder={t('contact.messagePlaceholder')}
                />
                {errors.message && (
                  <div className="flex items-center gap-2 mt-2 py-1.5 px-3"
                    style={{ borderLeft: '2px solid #6b1d1d', background: 'rgba(107,29,29,0.1)' }}
                  >
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#c75050' }} />
                    <p className="text-xs" style={{ color: '#c75050' }}>{errors.message}</p>
                  </div>
                )}
              </div>

              {/* Scoped styles for inputs/textarea */}
              <style jsx>{`
                input:focus, textarea:focus { border-bottom-color: #c9a84c !important; box-shadow: 0 2px 8px rgba(201,168,76,0.15); }
                input::placeholder, textarea::placeholder { color: #5a4f3c; font-style: italic; }
              `}</style>

              {/* Error status */}
              {submitStatus === 'error' && (
                <div className="flex items-center gap-2 py-2 px-3"
                  style={{ borderLeft: '2px solid #6b1d1d', background: 'rgba(107,29,29,0.1)' }}
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#c75050' }} />
                  <p className="text-sm" style={{ color: '#c75050' }}>{t('contact.error')}</p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className={`${playfair.className} flex-1 py-2.5 text-sm italic font-light transition-all duration-300 hover:text-[#c9a84c]`}
                  style={{
                    color: '#8b7355',
                    border: '1px solid rgba(139,115,85,0.25)',
                  }}
                >
                  {t('contact.cancel')}
                </button>
                <Button
                  type="submit"
                  className={`flex-1 !rounded-none !text-sm !tracking-[0.1em] !bg-transparent hover:!bg-[#c9a84c] transition-all duration-500 group/btn ${playfair.className}`}
                  style={{ border: '1px solid rgba(201,168,76,0.5)' } as React.CSSProperties}
                >
                  <span className="text-[#c9a84c] group-hover/btn:text-[#0a0806] transition-colors duration-500 italic">
                    {t('contact.send')}
                  </span>
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
