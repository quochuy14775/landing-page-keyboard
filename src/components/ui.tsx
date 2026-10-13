import type { ReactNode } from 'react'
import { motion } from 'motion/react'

const EASE = [0.22, 1, 0.36, 1] as const

/** Fades + lifts its children in once they scroll into view (IntersectionObserver, no scroll listeners). */
export function Reveal({ children, delay = 0, y = 32, className }: { children: ReactNode; delay?: number; y?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.9, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  )
}

/** Splits a headline into words that rise in sequence. */
export function WordsIn({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const words = text.split(' ')
  // observe the visible wrapper: the words start clipped by overflow-hidden,
  // so watching them directly would never report an intersection
  return (
    <motion.span
      className={className}
      aria-label={text}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.4 }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: delay } } }}
    >
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom" aria-hidden>
          <motion.span
            className="inline-block"
            variants={{ hidden: { y: '110%' }, show: { y: '0%' } }}
            transition={{ duration: 0.85, ease: EASE }}
          >
            {w}
            {i < words.length - 1 ? ' ' : ''}
          </motion.span>
        </span>
      ))}
    </motion.span>
  )
}

const CHAPTERS_TOTAL = 7

/** Section label; with `index` it reads like a chapter marker: "01 / 07 — Keycap". */
export function Eyebrow({ children, dark = false, index }: { children: ReactNode; dark?: boolean; index?: number }) {
  return (
    <p className={`mb-4 flex items-center gap-3 font-mono text-[11px] font-medium tracking-[0.22em] uppercase ${dark ? 'text-ice-200' : 'text-ice-600'}`}>
      {index !== undefined && (
        <>
          <span className="tabular-nums">
            {String(index).padStart(2, '0')}
            <span className="opacity-50"> / {String(CHAPTERS_TOTAL).padStart(2, '0')}</span>
          </span>
          <span className={`h-px w-6 ${dark ? 'bg-ice-200/50' : 'bg-ice-600/40'}`} aria-hidden />
        </>
      )}
      <span>{children}</span>
    </p>
  )
}

const ICONS = {
  grid: 'M4 5h16v14H4zM4 10h16M4 14.5h16M9 10v9M14 10v9',
  layers: 'm12 3 9 4.5-9 4.5-9-4.5zM3 12l9 4.5 9-4.5M3 16.5 12 21l9-4.5',
  signal: 'M5 20v-3M10 20v-7M15 20v-11M20 20V4',
  battery: 'M3 8h15v8H3zM18 10.5h2v3h-2M6 11v2M9 11v2',
  curve: 'M3 17c3-8 15-8 18 0M3 17h18',
  type: 'M5 6V4h14v2M12 4v16M9 20h6',
  volume: 'M11 5 6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13',
  wave: 'M2 12h2l2-6 3 12 3-15 3 15 3-9 2 3h2',
  plate: 'M3 6h18v12H3zM7 9h3v3H7zM14 9h3v3h-3zM7 14h10',
  switch: 'M7 3h10v6H7zM5 9h14v8H5zM10 17v4M14 17v4',
  sparkle: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6',
  devices: 'M3 5h13v10H3zM1 19h17M18 9h5v12h-5zM20.5 18h.01',
  arrow: 'M5 12h14M13 6l6 6-6 6',
} as const
export type IconName = keyof typeof ICONS

export function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={ICONS[name]} />
    </svg>
  )
}

export function Panel({ children, dark = false, className = '' }: { children: ReactNode; dark?: boolean; className?: string }) {
  return (
    <div
      className={`${dark ? 'glass-dark text-white ring-white/10' : 'glass ring-white/70'} rounded-3xl p-5 shadow-[0_20px_60px_-25px_rgba(15,27,45,0.35)] ring-1 sm:p-7 md:p-9 ${className}`}
    >
      {children}
    </div>
  )
}
