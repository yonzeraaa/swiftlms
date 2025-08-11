'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward } from 'lucide-react'
import { motion } from 'framer-motion'

interface VideoPlayerProps {
  url: string
  title?: string
  onComplete?: () => void
  autoPlay?: boolean
}

export default function VideoPlayer({ url, title, onComplete, autoPlay = false }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
    }

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      setProgress((video.currentTime / video.duration) * 100)
      
      if (video.currentTime === video.duration && onComplete) {
        onComplete()
      }
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)

    if (autoPlay) {
      video.play().catch(console.error)
    }

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
    }
  }, [url, onComplete, autoPlay])

  const handlePlayPause = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play()
    }
  }

  const handleMuteToggle = () => {
    const video = videoRef.current
    if (!video) return

    video.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return

    const newTime = (parseFloat(e.target.value) / 100) * duration
    video.currentTime = newTime
  }

  const handleSkip = (seconds: number) => {
    const video = videoRef.current
    if (!video) return

    video.currentTime = Math.max(0, Math.min(video.currentTime + seconds, duration))
  }

  const handleFullscreen = () => {
    const container = containerRef.current
    if (!container) return

    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      container.requestFullscreen()
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleMouseMove = () => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false)
      }
    }, 3000)
  }

  const isYouTubeUrl = url?.includes('youtube.com') || url?.includes('youtu.be')
  const isVimeoUrl = url?.includes('vimeo.com')

  if (isYouTubeUrl || isVimeoUrl) {
    let embedUrl = ''
    
    if (isYouTubeUrl) {
      const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)?.[1]
      embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=${autoPlay ? 1 : 0}` : ''
    } else if (isVimeoUrl) {
      const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1]
      embedUrl = videoId ? `https://player.vimeo.com/video/${videoId}?autoplay=${autoPlay ? 1 : 0}` : ''
    }

    if (!embedUrl) {
      return (
        <div className="bg-navy-900/50 rounded-lg p-8 text-center">
          <p className="text-gold-300">URL de vídeo inválida</p>
        </div>
      )
    }

    return (
      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
        <iframe
          src={embedUrl}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className="relative w-full aspect-video bg-black rounded-lg overflow-hidden group"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={url}
        className="w-full h-full object-contain"
        onClick={handlePlayPause}
      />

      <motion.div
        initial={false}
        animate={{ opacity: showControls ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none"
      />

      <motion.div
        initial={false}
        animate={{ opacity: showControls ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="absolute bottom-0 left-0 right-0 p-4 space-y-2"
      >
        <div className="flex items-center gap-2">
          <input
            type="range"
            value={progress}
            onChange={handleSeek}
            className="flex-1 h-1 bg-gold-500/30 rounded-full appearance-none cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:w-3
                     [&::-webkit-slider-thumb]:h-3
                     [&::-webkit-slider-thumb]:bg-gold-500
                     [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:cursor-pointer"
          />
          <span className="text-xs text-white">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePlayPause}
              className="p-2 rounded-full bg-gold-500/20 hover:bg-gold-500/30 transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-white" />
              )}
            </button>

            <button
              onClick={() => handleSkip(-10)}
              className="p-2 rounded-full bg-gold-500/20 hover:bg-gold-500/30 transition-colors"
            >
              <SkipBack className="w-4 h-4 text-white" />
            </button>

            <button
              onClick={() => handleSkip(10)}
              className="p-2 rounded-full bg-gold-500/20 hover:bg-gold-500/30 transition-colors"
            >
              <SkipForward className="w-4 h-4 text-white" />
            </button>

            <button
              onClick={handleMuteToggle}
              className="p-2 rounded-full bg-gold-500/20 hover:bg-gold-500/30 transition-colors"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-white" />
              ) : (
                <Volume2 className="w-4 h-4 text-white" />
              )}
            </button>
          </div>

          <button
            onClick={handleFullscreen}
            className="p-2 rounded-full bg-gold-500/20 hover:bg-gold-500/30 transition-colors"
          >
            <Maximize className="w-4 h-4 text-white" />
          </button>
        </div>
      </motion.div>

      {!isPlaying && showControls && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          onClick={handlePlayPause}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
                   w-16 h-16 rounded-full bg-gold-500/30 backdrop-blur-sm
                   flex items-center justify-center hover:bg-gold-500/40 transition-colors"
        >
          <Play className="w-8 h-8 text-white ml-1" />
        </motion.button>
      )}
    </div>
  )
}