import { useEffect, useState } from 'react'
import { X, ChevronLeft, ChevronRight, Camera } from 'lucide-react'
import { supabase } from '../lib/supabase'

const CATEGORIES = [
  { key: 'all',        label: 'All' },
  { key: 'tournament', label: 'Tournaments' },
  { key: 'coaching',   label: 'Coaching / Classes' },
  { key: 'event',      label: 'Club Events' },
]

export default function Gallery() {
  const [photos, setPhotos] = useState([])
  const [filtered, setFiltered] = useState([])
  const [category, setCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState(null) // index

  useEffect(() => {
    async function fetchPhotos() {
      const { data } = await supabase
        .from('gallery_photos')
        .select('*')
        .order('date', { ascending: false })
      setPhotos(data || [])
      setFiltered(data || [])
      setLoading(false)
    }
    fetchPhotos()
  }, [])

  useEffect(() => {
    setFiltered(
      category === 'all' ? photos : photos.filter(p => p.category === category)
    )
    setLightbox(null)
  }, [category, photos])

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightbox === null) return
    function onKey(e) {
      if (e.key === 'ArrowRight') setLightbox(i => Math.min(i + 1, filtered.length - 1))
      if (e.key === 'ArrowLeft')  setLightbox(i => Math.max(i - 1, 0))
      if (e.key === 'Escape')     setLightbox(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, filtered.length])

  const currentPhoto = lightbox !== null ? filtered[lightbox] : null

  return (
    <div className="relative min-h-screen pt-20 pb-12 px-4">
      <img src="/PCA.png" alt="" style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', opacity: 0.1, pointerEvents: 'none', zIndex: 0 }} />
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="py-10 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white-900 mb-3">Gallery</h1>
          <p className="text-white-900 text-lg max-w-xl mx-auto">
            Snapshots from our tournaments, events, and chess community in Hyderabad
          </p>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                category === cat.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-navy-800 border border-navy-700 text-slate-400 hover:text-white hover:border-navy-500'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {loading ? (
          /* Skeleton grid */
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="bg-navy-800 rounded-xl animate-pulse break-inside-avoid mb-4"
                style={{ height: `${180 + (i % 3) * 60}px` }}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Camera size={56} className="mx-auto mb-4 opacity-20" />
            <p className="text-xl text-slate-700 font-medium mb-2">
              {photos.length === 0 ? 'Photos coming soon' : 'No photos in this category'}
            </p>
            <p className="text-sm text-slate-500">
              {photos.length === 0
                ? 'Gallery photos will be added before the site goes live.'
                : 'Try a different category filter.'}
            </p>
          </div>
        ) : (
          /* Masonry grid */
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
            {filtered.map((photo, index) => (
              <div
                key={photo.id}
                className="break-inside-avoid mb-4 group relative cursor-pointer overflow-hidden rounded-xl"
                onClick={() => setLightbox(index)}
              >
                <img
                  src={photo.url}
                  alt={photo.caption || photo.event_name || 'Gallery photo'}
                  className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-navy-900/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-4">
                  {photo.event_name && (
                    <p className="text-white font-medium text-sm">{photo.event_name}</p>
                  )}
                  {photo.date && (
                    <p className="text-slate-400 text-xs mt-0.5">
                      {new Date(photo.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })}
                    </p>
                  )}
                  {photo.caption && (
                    <p className="text-slate-300 text-xs mt-1 line-clamp-2">{photo.caption}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {currentPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 lightbox-overlay flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          {/* Prev */}
          {lightbox > 0 && (
            <button
              className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-navy-800/80 border border-navy-600 flex items-center justify-center text-white hover:bg-navy-700 transition-colors z-10"
              onClick={e => { e.stopPropagation(); setLightbox(i => i - 1) }}
            >
              <ChevronLeft size={20} />
            </button>
          )}

          {/* Image */}
          <div
            className="max-w-5xl w-full"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={currentPhoto.url}
              alt={currentPhoto.caption || currentPhoto.event_name || ''}
              className="w-full max-h-[80vh] object-contain rounded-xl"
            />
            {(currentPhoto.event_name || currentPhoto.caption) && (
              <div className="text-center mt-4">
                {currentPhoto.event_name && (
                  <p className="text-white font-medium">{currentPhoto.event_name}</p>
                )}
                {currentPhoto.caption && (
                  <p className="text-slate-400 text-sm mt-1">{currentPhoto.caption}</p>
                )}
              </div>
            )}
            <p className="text-center text-slate-600 text-xs mt-2">
              {lightbox + 1} / {filtered.length}
            </p>
          </div>

          {/* Next */}
          {lightbox < filtered.length - 1 && (
            <button
              className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-navy-800/80 border border-navy-600 flex items-center justify-center text-white hover:bg-navy-700 transition-colors z-10"
              onClick={e => { e.stopPropagation(); setLightbox(i => i + 1) }}
            >
              <ChevronRight size={20} />
            </button>
          )}

          {/* Close */}
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-navy-800/80 border border-navy-600 flex items-center justify-center text-white hover:bg-navy-700 transition-colors"
            onClick={() => setLightbox(null)}
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  )
}
