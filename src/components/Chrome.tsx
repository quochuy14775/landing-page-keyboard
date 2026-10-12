import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from 'motion/react'
import { useLoading } from '../lib/loading'
import { CHAPTERS, useActiveChapter } from '../lib/chapters'
import { setSoundEnabled, useSoundEnabled } from '../lib/sound'
import { PRODUCT } from '../config/product'
import { scrollToId } from '../lib/scroll'
import { formatVnd } from '../lib/format'

export function Preloader() {
  const { progress, done: loaded } = useLoading()
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (!loaded) return
    const t = setTimeout(() => setDone(true), 350)
    return () => clearTimeout(t)
  }, [loaded])

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-paper"
          exit={{ opacity: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } }}
        >
          <div className="flex gap-1.5">
            {'F75'.split('').map((c, i) => (
              <motion.span
                key={c}
                className="flex h-14 w-14 items-center justify-center rounded-xl bg-white font-mono text-xl font-bold shadow-[0_6px_0_#bcd5ea]"
                animate={{ y: [0, 5, 0], boxShadow: ['0 6px 0 #bcd5ea', '0 1px 0 #bcd5ea', '0 6px 0 #bcd5ea'] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 0.6, delay: i * 0.15 }}
              >
                {c}
              </motion.span>
            ))}
          </div>
          <div className="mt-8 h-[3px] w-48 overflow-hidden rounded-full bg-ice-100">
            <motion.div className="h-full bg-ice-600" animate={{ width: `${progress}%` }} transition={{ ease: 'easeOut' }} />
          </div>
          <p className="mt-3 font-mono text-[11px] tabular-nums text-mute">{Math.round(progress)}%</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Small buy bar that slides up once the hero is gone, and hides again at the buy section. */
export function StickyBuy() {
  const { scrollY } = useScroll()
  const [show, setShow] = useState(false)
  useMotionValueEvent(scrollY, 'change', (y) => {
    const buy = document.getElementById('mua-ngay')
    const nearBuy = buy ? buy.getBoundingClientRect().top < window.innerHeight * 0.8 : false
    setShow(y > window.innerHeight * 0.8 && !nearBuy)
  })
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-xl items-center justify-between gap-4 rounded-2xl px-5 py-3 glass ring-1 ring-white/60 shadow-[0_20px_50px_-20px_rgba(15,27,45,0.45)]"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{PRODUCT.name}</p>
            <p className="truncate text-xs text-mute">{PRODUCT.price ? formatVnd(PRODUCT.price) : 'Liên hệ để có giá tốt'}</p>
          </div>
          <button onClick={() => scrollToId('mua-ngay')} className="shrink-0 rounded-xl bg-ice-600 px-4 py-2 text-sm font-semibold text-white">
            Mua ngay
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const EQ = [0.55, 1, 0.7, 0.85]
let soundTouched = false

/** Keycap-style sound switch: equalizer bars dance while sound is on. */
export function SoundToggle({ dark = false }: { dark?: boolean }) {
  const on = useSoundEnabled()
  const [touched, setTouched] = useState(soundTouched)
  const [tip, setTip] = useState(false)
  const label = on ? 'Tắt âm thanh' : 'Bật âm thanh'
  const edge = on ? '#7fb0e6' : dark ? 'rgba(0,0,0,0.55)' : '#c9d9ea'

  return (
    <div className="relative" onMouseEnter={() => setTip(true)} onMouseLeave={() => setTip(false)}>
      {/* invite ring until the visitor tries sound once */}
      {!on && !touched && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-ice-400"
          animate={{ scale: [1, 1.35], opacity: [0.55, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut', repeatDelay: 0.6 }}
        />
      )}
      <motion.button
        onClick={() => {
          soundTouched = true
          setTouched(true)
          setSoundEnabled(!on)
        }}
        aria-pressed={on}
        aria-label={label}
        initial="rest"
        whileHover="hover"
        whileTap="press"
        variants={{
          rest: { y: 0, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.7), 0 3px 0 ${edge}` },
          hover: { y: -1, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.7), 0 4px 0 ${edge}` },
          press: { y: 2, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.7), 0 1px 0 ${edge}` },
        }}
        transition={{ type: 'spring', stiffness: 700, damping: 30 }}
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-ice-400 ${
          on ? 'bg-gradient-to-b from-ice-50 to-ice-100' : dark ? 'bg-white/10' : 'bg-gradient-to-b from-white to-ice-50'
        }`}
      >
        <span className="flex h-4 items-center gap-[3px]" aria-hidden>
          {EQ.map((h, i) => (
            <motion.span
              key={i}
              className={`w-[3px] rounded-full ${on ? 'bg-ice-600' : dark ? 'bg-white/45' : 'bg-mute/50'}`}
              style={{ height: 16, originY: 0.5 }}
              animate={on ? { scaleY: [h * 0.35, h, h * 0.5, h * 0.9, h * 0.35] } : { scaleY: 0.2 }}
              transition={
                on
                  ? { duration: 0.9 + i * 0.13, repeat: Infinity, ease: 'easeInOut', delay: i * 0.08 }
                  : { type: 'spring', stiffness: 400, damping: 25 }
              }
            />
          ))}
        </span>
      </motion.button>
      <AnimatePresence>
        {tip && (
          <motion.span
            role="tooltip"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-none absolute top-full left-1/2 mt-2.5 -translate-x-1/2 rounded-lg bg-ink px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-white shadow-lg"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Replaces the hidden browser scrollbar: one tick per chapter, a fill line for overall progress. */
export function SectionRail() {
  const { scrollYProgress } = useScroll()
  const fill = useSpring(scrollYProgress, { stiffness: 160, damping: 32, mass: 0.3 })
  const active = useActiveChapter()
  const [hover, setHover] = useState<number | null>(null)

  return (
    <nav aria-label="Mục lục trang" className="fixed top-1/2 right-4 z-40 hidden -translate-y-1/2 md:block">
      <div className="relative flex flex-col items-end gap-3.5 rounded-full px-2 py-4 glass ring-1 ring-white/60">
        <span className="absolute top-4 right-[13px] bottom-4 w-px bg-ink/10" aria-hidden />
        <motion.span
          style={{ scaleY: fill }}
          className="absolute top-4 right-[13px] bottom-4 w-px origin-top bg-ice-600"
          aria-hidden
        />
        {CHAPTERS.map((c, i) => {
          const on = i === active
          const show = on || hover === i
          return (
            <button
              key={c.id}
              onClick={() => scrollToId(c.id)}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              aria-label={c.label}
              aria-current={on ? 'true' : undefined}
              className="relative flex h-3 items-center"
            >
              <AnimatePresence>
                {show && (
                  <motion.span
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 6 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-7 rounded-lg bg-ink px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap text-white"
                  >
                    {c.label}
                  </motion.span>
                )}
              </AnimatePresence>
              <motion.span
                animate={{ width: on ? 14 : 7, backgroundColor: on ? '#2f6fb8' : 'rgba(15,27,45,0.3)' }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="relative z-10 block h-[3px] rounded-full"
              />
            </button>
          )
        })}
      </div>
    </nav>
  )
}
