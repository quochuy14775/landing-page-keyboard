import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from 'motion/react'
import { CHAPTERS, useActiveChapter, type ChapterId } from '../lib/chapters'
import { lenis, scrollToId } from '../lib/scroll'
import { PRODUCT } from '../config/product'
import { formatVnd } from '../lib/format'
import { SoundToggle } from './Chrome'

const EASE = [0.22, 1, 0.36, 1] as const

// Nav items group several story chapters (e.g. keycap + knob = "Thiết kế").
const NAV: { label: string; to: ChapterId; covers: ChapterId[] }[] = [
  { label: 'Thiết kế', to: 'keycap', covers: ['keycap', 'knob'] },
  { label: 'Cấu trúc', to: 'cau-truc', covers: ['cau-truc'] },
  { label: 'Âm thanh', to: 'am-thanh', covers: ['am-thanh'] },
  { label: 'Kết nối', to: 'ket-noi', covers: ['ket-noi'] },
  { label: 'RGB', to: 'rgb', covers: ['rgb'] },
  { label: 'Thông số', to: 'thong-so', covers: ['thong-so', 'mua-ngay'] },
]

/** Keycap-shaped brand mark; dips like a key press on hover. */
function Logo({ dark }: { dark: boolean }) {
  return (
    <motion.button
      onClick={() => scrollToId('top')}
      initial="rest"
      whileHover="hover"
      whileTap="press"
      aria-label={`${PRODUCT.name} – về đầu trang`}
      className="flex items-center gap-2.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ice-400"
    >
      {/* keycap rendered from the Blender model; dips on hover, bottoms out on press */}
      <span className="relative block h-10 w-10">
        {/* contact shadow: spreads and fades as the cap lifts away */}
        <motion.span
          aria-hidden
          variants={{
            rest: { scale: 1, opacity: 0.35, filter: 'blur(3px)' },
            hover: { scale: 1.25, opacity: 0.16, filter: 'blur(5px)' },
            press: { scale: 0.85, opacity: 0.55, filter: 'blur(2px)' },
          }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="absolute inset-x-1.5 bottom-0.5 h-2 rounded-full bg-ink"
        />
        {/* outer layer: lift + tilt on a spring; inner layer: gentle bob once floating */}
        <motion.span
          className="relative block h-10 w-10"
          variants={{
            rest: { y: 0, rotate: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 18 } },
            hover: { y: -5, rotate: -8, scale: 1.08, transition: { type: 'spring', stiffness: 260, damping: 14 } },
            press: { y: 3.5, rotate: 0, scale: 0.96, transition: { type: 'spring', stiffness: 900, damping: 22, mass: 0.6 } },
          }}
        >
          <motion.img
            src="/brand/logo-key.png"
            alt=""
            draggable={false}
            width={40}
            height={40}
            variants={{
              rest: { y: 0, transition: { duration: 0.3 } },
              hover: { y: -2, transition: { duration: 1.4, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut', delay: 0.3 } },
              press: { y: 0, transition: { duration: 0.1 } },
            }}
            className="block h-10 w-10 drop-shadow-[0_6px_8px_rgba(15,27,45,0.12)] select-none"
          />
        </motion.span>
      </span>
      <span className={`font-display text-[15px] font-bold tracking-[0.14em] transition-colors ${dark ? 'text-white' : 'text-ink'}`}>
        AULA
      </span>
    </motion.button>
  )
}

const INK_EDGE = '#050a12'

/** Keycap-style CTA: raised edge that compresses on press, light sweep + sliding arrow on hover. */
function BuyButton({ compact = false, onClick }: { compact?: boolean; onClick?: () => void }) {
  const top = 'inset 0 1px 0 rgba(255,255,255,0.16)'
  const glow = '0 12px 24px -10px rgba(15,27,45,0.55)'
  return (
    <motion.button
      onClick={onClick ?? (() => scrollToId('mua-ngay'))}
      initial="rest"
      whileHover="hover"
      whileTap="press"
      variants={{
        rest: { y: 0, boxShadow: `${top}, 0 3px 0 ${INK_EDGE}, ${glow}` },
        hover: { y: -1, boxShadow: `${top}, 0 4px 0 ${INK_EDGE}, 0 16px 28px -10px rgba(47,111,184,0.55)` },
        press: { y: 2, boxShadow: `${top}, 0 1px 0 ${INK_EDGE}, ${glow}` },
      }}
      transition={{ type: 'spring', stiffness: 700, damping: 30 }}
      className={`relative flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-b from-[#1c2b44] to-ink font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-ice-400 ${
        compact ? 'h-10 px-4 text-sm' : 'h-12 px-6 text-base'
      }`}
    >
      {/* light sweep */}
      <motion.span
        aria-hidden
        variants={{ rest: { x: '-130%' }, hover: { x: '130%' }, press: { x: '130%' } }}
        transition={{ duration: 0.7, ease: EASE }}
        className="pointer-events-none absolute inset-y-0 left-0 w-2/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent"
      />
      <span className="relative">Mua ngay</span>
      <span className="relative flex h-5 w-5 items-center justify-center overflow-hidden rounded-md bg-white/12" aria-hidden>
        <motion.svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          className="absolute"
          variants={{ rest: { x: 0 }, hover: { x: 14 } }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          <path d="M2 6h8M6.5 2.5 10 6 6.5 9.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
        <motion.svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          className="absolute"
          variants={{ rest: { x: -14 }, hover: { x: 0 } }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          <path d="M2 6h8M6.5 2.5 10 6 6.5 9.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </span>
    </motion.button>
  )
}

function View3DLink({ dark, big = false }: { dark: boolean; big?: boolean }) {
  return (
    <motion.a
      href="/trai-nghiem-3d"
      initial="rest"
      whileHover="hover"
      whileTap={{ scale: 0.96 }}
      className={`group flex items-center gap-2 rounded-xl font-semibold ring-1 outline-none focus-visible:ring-2 focus-visible:ring-ice-400 ${
        big ? 'h-12 px-5 text-base' : 'h-10 px-3 text-sm'
      } ${dark ? 'text-white ring-white/15 hover:bg-white/10' : 'bg-white/70 text-ink ring-ice-100 hover:bg-white'}`}
    >
      <motion.svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        aria-hidden
        variants={{ rest: { rotate: 0 }, hover: { rotate: 180 } }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        <path d="M12 2.5 20.5 7v10L12 21.5 3.5 17V7z" />
        <path d="M3.5 7 12 11.5 20.5 7M12 11.5v10" />
      </motion.svg>
      Xem 3D
    </motion.a>
  )
}

export function Header() {
  const active = useActiveChapter()
  const activeId = CHAPTERS[active].id
  const dark = activeId === 'rgb'
  const [hidden, setHidden] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [hover, setHover] = useState<number | null>(null)
  const [menu, setMenu] = useState(false)

  const { scrollY, scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.3 })
  const last = useRef(0)

  // hide while reading downward, come back on any upward scroll
  useMotionValueEvent(scrollY, 'change', (y) => {
    const delta = y - last.current
    last.current = y
    setScrolled(y > 40)
    if (y < window.innerHeight * 0.85) setHidden(false)
    else if (Math.abs(delta) > 4) setHidden(delta > 0)
  })
  const closeMenu = useCallback(() => setMenu(false), [])

  const current = NAV.findIndex((n) => n.covers.includes(activeId))

  return (
    <>
      <motion.header
        initial={false}
        animate={{ y: hidden && !menu ? -110 : 0 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="fixed inset-x-0 top-0 z-40 px-3 pt-3"
      >
        <motion.div
          layout
          transition={{ duration: 0.5, ease: EASE }}
          className={`relative mx-auto flex items-center justify-between gap-4 rounded-2xl px-3 py-2 ring-1 transition-[background-color,box-shadow] duration-500 md:px-4 ${
            scrolled || menu
              ? `max-w-5xl shadow-[0_18px_40px_-24px_rgba(15,27,45,0.45)] ${dark ? 'glass-dark ring-white/10' : 'glass ring-white/70'}`
              : 'max-w-6xl ring-transparent'
          }`}
        >
          <Logo dark={dark && !menu} />

          <nav aria-label="Điều hướng chính" className="hidden lg:block" onMouseLeave={() => setHover(null)}>
            <ul className="relative flex items-center">
              {NAV.map((n, i) => {
                const on = i === current
                return (
                  <li key={n.to} className="relative">
                    <button
                      onClick={() => scrollToId(n.to)}
                      onMouseEnter={() => setHover(i)}
                      aria-current={on ? 'location' : undefined}
                      className={`relative z-10 rounded-lg px-3.5 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ice-400 ${
                        on ? (dark ? 'text-white' : 'text-ink') : dark ? 'text-white/60 hover:text-white' : 'text-mute hover:text-ink'
                      }`}
                    >
                      {n.label}
                    </button>
                    {hover === i && (
                      <motion.span
                        layoutId="nav-hover"
                        transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                        className={`absolute inset-0 rounded-lg ${dark ? 'bg-white/8' : 'bg-ink/[0.04]'}`}
                      />
                    )}
                    {on && (
                      <motion.span
                        layoutId="nav-active"
                        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                        className={`absolute inset-x-3 -bottom-0.5 h-[2px] rounded-full ${dark ? 'bg-ice-300' : 'bg-ice-600'}`}
                      />
                    )}
                  </li>
                )
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              <View3DLink dark={dark && !menu} />
            </div>
            <SoundToggle dark={dark && !menu} />
            <div className="hidden sm:block">
              <BuyButton compact />
            </div>
            <button
              onClick={() => setMenu((m) => !m)}
              aria-expanded={menu}
              aria-controls="mobile-menu"
              aria-label={menu ? 'Đóng menu' : 'Mở menu'}
              className={`relative flex h-10 w-10 items-center justify-center rounded-xl ring-1 outline-none focus-visible:ring-2 focus-visible:ring-ice-400 lg:hidden ${
                dark && !menu ? 'text-white ring-white/15' : 'bg-white/70 text-ink ring-ice-100'
              }`}
            >
              {[0, 1].map((i) => (
                <motion.span
                  key={i}
                  animate={menu ? { rotate: i ? -45 : 45, y: 0 } : { rotate: 0, y: i ? 3.5 : -3.5 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="absolute h-[1.5px] w-4 rounded-full bg-current"
                />
              ))}
            </button>
          </div>

          {/* scroll progress, drawn along the bottom edge of the bar */}
          <motion.span
            aria-hidden
            style={{ scaleX: progress }}
            className={`absolute inset-x-4 bottom-0 h-[2px] origin-left rounded-full transition-opacity duration-500 ${
              scrolled ? 'opacity-100' : 'opacity-0'
            } ${dark ? 'bg-ice-300/80' : 'bg-ice-600/70'}`}
          />
        </motion.div>
      </motion.header>

      <MobileMenu open={menu} onClose={closeMenu} current={current} />
    </>
  )
}

function MobileMenu({ open, onClose, current }: { open: boolean; onClose: () => void; current: number }) {
  useEffect(() => {
    if (!open) return
    lenis?.stop()
    document.documentElement.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      lenis?.start()
      document.documentElement.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  const go = (id: ChapterId) => {
    onClose()
    // let the overlay close and scrolling unlock before travelling
    setTimeout(() => scrollToId(id), 350)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          initial={{ clipPath: 'inset(0 0 100% 0 round 0 0 28px 28px)' }}
          animate={{ clipPath: 'inset(0 0 0% 0 round 0 0 0px 0px)' }}
          exit={{ clipPath: 'inset(0 0 100% 0 round 0 0 28px 28px)' }}
          transition={{ duration: 0.6, ease: EASE }}
          className="fixed inset-0 z-30 flex flex-col bg-paper px-6 pt-24 pb-8 lg:hidden"
        >
          <ul className="flex flex-1 flex-col justify-center gap-1">
            {NAV.map((n, i) => (
              <li key={n.to} className="overflow-hidden">
                <motion.button
                  initial={{ y: '100%' }}
                  animate={{ y: '0%' }}
                  exit={{ y: '100%' }}
                  transition={{ duration: 0.6, ease: EASE, delay: 0.12 + i * 0.05 }}
                  onClick={() => go(n.to)}
                  className="flex w-full items-baseline gap-4 py-2 text-left"
                >
                  <span className="w-6 font-mono text-[11px] font-medium tabular-nums text-ice-600">{String(i + 1).padStart(2, '0')}</span>
                  <span className={`font-display text-4xl font-semibold tracking-tight ${i === current ? 'text-ink' : 'text-ink/35'}`}>{n.label}</span>
                </motion.button>
              </li>
            ))}
          </ul>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.45 }}
            className="flex items-center justify-between gap-4 border-t border-ice-100 pt-6"
          >
            <div>
              <p className="text-sm font-bold">{PRODUCT.name}</p>
              <p className="text-xs text-mute">{PRODUCT.price ? formatVnd(PRODUCT.price) : 'Liên hệ để có giá tốt'}</p>
            </div>
            <div className="flex gap-2">
              <View3DLink dark={false} big />
              <BuyButton onClick={() => go('mua-ngay')} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
