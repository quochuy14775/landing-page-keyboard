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

export function Eyebrow({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <p className={`mb-4 font-mono text-[11px] font-medium tracking-[0.22em] uppercase ${dark ? 'text-ice-200' : 'text-ice-600'}`}>
      {children}
    </p>
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
