import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion, useInView, useMotionValue, useTransform } from 'motion/react'
import { LAYERS, PRODUCT, SPECS } from '../config/product'
import { scrollToId, useStoryTrigger } from '../lib/scroll'
import { SHOTS, story } from '../lib/story'
import { setSoundEnabled } from '../lib/sound'
import { formatVnd } from '../lib/format'
import { Eyebrow, Panel, Reveal, WordsIn } from './ui'

// Camera paths – module constants so the scroll triggers are created once.
const P_HERO = [SHOTS.hero, SHOTS.keys]
const P_KEYS = [SHOTS.keys, SHOTS.keys, SHOTS.keysEnd]
const P_KNOB = [SHOTS.keysEnd, SHOTS.knob, SHOTS.knobEnd]
const P_STRUCT = [SHOTS.knobEnd, SHOTS.structure, SHOTS.structureEnd, SHOTS.structureEnd]
const W_STRUCT = [0.1, 0.35, 0.55]
const P_SOUND = [SHOTS.structureEnd, SHOTS.sound, SHOTS.sound]
const P_CONNECT = [SHOTS.sound, SHOTS.connect, SHOTS.connectEnd]
const P_RGB = [SHOTS.connectEnd, SHOTS.rgb, SHOTS.rgbEnd, SHOTS.rgbEnd]
const P_OUTRO = [SHOTS.rgbEnd, SHOTS.outro]

/* ------------------------------------------------------------------ hero */
export function Hero() {
  const ref = useRef<HTMLElement>(null)
  useStoryTrigger(ref, { path: P_HERO, start: 'top top', end: 'bottom top', edge: 'first' })
  return (
    <section id="top" ref={ref} className="relative flex h-svh items-end px-5 pb-14 md:px-12 md:pb-20">
      <div className="behind pointer-events-none absolute inset-x-0 top-24 text-center md:top-28">
        <motion.p
          initial={{ opacity: 0, letterSpacing: '0.6em' }}
          animate={{ opacity: 1, letterSpacing: '0.32em' }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
          className="font-mono text-[11px] font-medium text-ice-600 uppercase"
        >
          Bàn phím cơ 75% · Gasket mount
        </motion.p>
        <h1 className="mt-3 text-[18vw] leading-[0.85] font-extrabold tracking-[-0.045em] text-ink/90 md:text-[13vw]">
          <WordsIn text="AULA F75" delay={0.5} />
        </h1>
      </div>
      <div className="relative flex w-full flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <Reveal delay={0.9} className="max-w-md">
          <p className="text-xl font-semibold text-balance md:text-2xl">{PRODUCT.tagline}</p>
          <p className="mt-3 text-mute">Bấm thử bất kỳ phím nào trên bàn phím 3D.</p>
        </Reveal>
        <Reveal delay={1.05} className="flex gap-3">
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => scrollToId('mua-ngay')}
            className="rounded-2xl bg-ink px-6 py-3.5 font-semibold text-white shadow-[0_14px_30px_-12px_rgba(15,27,45,0.6)]"
          >
            Mua ngay
          </motion.button>
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => scrollToId('cau-truc')}
            className="rounded-2xl px-6 py-3.5 font-semibold glass ring-1 ring-white/70"
          >
            Xem cấu trúc
          </motion.button>
        </Reveal>
      </div>
      <motion.div
        className="absolute bottom-5 left-1/2 hidden h-10 w-6 -translate-x-1/2 rounded-full border-2 border-ink/25 md:block"
        aria-hidden
      >
        <motion.span
          className="absolute top-2 left-1/2 h-2 w-1 -translate-x-1/2 rounded-full bg-ink/40"
          animate={{ y: [0, 12, 0], opacity: [1, 0.2, 1] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
      </motion.div>
    </section>
  )
}

/* -------------------------------------------------------------- keycaps */
const TYPE = [
  ['A', 'Key_A'],
  ['U', 'Key_U'],
  ['L', 'Key_L'],
  ['A', 'Key_A'],
  [' ', 'Key_SPACE'],
  ['F', 'Key_F'],
  ['7', 'Key_7_&'],
  ['5', 'Key_5_%'],
] as const

export function Keycaps() {
  const ref = useRef<HTMLElement>(null)
  const typed = useRef<HTMLSpanElement>(null)
  const onProgress = useCallback((p: number) => {
    // type "AULA F75" across the first 70% of the section
    story.press.clear()
    let count = 0
    TYPE.forEach(([, key], i) => {
      const t = 0.12 + i * 0.07
      if (p >= t) count = i + 1
      if (p >= t && p < t + 0.045) story.press.set(key, 1)
    })
    if (typed.current) typed.current.textContent = TYPE.slice(0, count).map(([c]) => c).join('')
    story.invalidate()
  }, [])
  useStoryTrigger(ref, { path: P_KEYS, onProgress })

  return (
    <section id="keycap" ref={ref} className="relative h-[260vh]">
      <div className="sticky top-0 flex h-svh items-end justify-end px-4 pb-24 md:items-center md:px-12 md:pb-0">
        <Panel className="w-full max-w-md">
          <Eyebrow>Keycap PBT double-shot</Eyebrow>
          <h2 className="text-2xl leading-tight font-bold text-balance sm:text-3xl md:text-4xl">
            <WordsIn text="Chạm vào là thấy khác." />
          </h2>
          <p className="mt-3 text-sm text-mute md:mt-4 md:text-base">
            Nhựa PBT đúc hai lớp, profile Cherry thấp và ôm ngón. Chữ in ở mặt trước, mặt phím phẳng mịn, không bóng
            theo thời gian.
          </p>
          <div className="mt-4 flex h-12 items-center rounded-2xl bg-white/70 px-4 font-mono text-xl md:mt-6 md:h-14 md:text-2xl font-semibold tracking-widest ring-1 ring-ice-100">
            <span ref={typed} />
            <motion.span
              className="ml-0.5 inline-block h-7 w-[3px] bg-ice-600"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          </div>
          <ul className="mt-6 hidden grid-cols-3 gap-3 text-center text-xs font-semibold sm:grid">
            {['Double-shot', 'Cherry profile', 'Side-print'].map((t, i) => (
              <Reveal key={t} delay={i * 0.08} y={16}>
                <li className="rounded-xl bg-ice-50 px-2 py-3 ring-1 ring-ice-100">{t}</li>
              </Reveal>
            ))}
          </ul>
        </Panel>
      </div>
    </section>
  )
}

/* ----------------------------------------------------------------- knob */
export function Knob() {
  const ref = useRef<HTMLElement>(null)
  const bar = useRef<HTMLDivElement>(null)
  const label = useRef<HTMLSpanElement>(null)
  const onProgress = useCallback((p: number) => {
    const v = Math.round(Math.min(1, Math.max(0, (p - 0.5) / 0.5)) * 100)
    if (bar.current) bar.current.style.transform = `scaleX(${v / 100})`
    if (label.current) label.current.textContent = String(v)
  }, [])
  useStoryTrigger(ref, { path: P_KNOB, onProgress })
  return (
    <section id="knob" ref={ref} className="relative h-[220vh]">
      <div className="sticky top-0 flex h-svh items-end px-4 pb-24 md:items-center md:px-12 md:pb-0">
        <Panel className="w-full max-w-md">
          <Eyebrow>Núm nhôm CNC</Eyebrow>
          <h2 className="text-2xl leading-tight font-bold text-balance sm:text-3xl md:text-4xl">
            <WordsIn text="Âm lượng trong một vòng xoay." />
          </h2>
          <p className="mt-3 text-sm text-mute md:mt-4 md:text-base">
            Vòng nhôm tiện nguyên khối, mép vát bóng, mặt chèn trắng nhám. Xoay mượt, có nấc, điều chỉnh âm lượng ngay
            trên bàn phím.
          </p>
          <div className="mt-5 md:mt-7">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-mute">
              <span>Âm lượng</span>
              <span className="tabular-nums text-ink">
                <span ref={label}>0</span>%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-ice-100">
              <div ref={bar} className="h-full origin-left scale-x-0 rounded-full bg-gradient-to-r from-ice-300 to-ice-600" />
            </div>
          </div>
        </Panel>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------ structure */
export function Structure() {
  const ref = useRef<HTMLElement>(null)
  const [active, setActive] = useState(-1)
  const stage = useRef<HTMLParagraphElement>(null)
  const onProgress = useCallback((p: number) => {
    // after the explode leg (first 45%), walk through the layers top -> bottom
    const walk = (p - 0.45) / 0.55
    const idx = walk < 0 ? -1 : Math.min(LAYERS.length - 1, Math.floor(walk * LAYERS.length))
    story.focusLayer = idx
    setActive((a) => (a === idx ? a : idx))
    if (stage.current) stage.current.textContent = idx < 0 ? 'Cuộn để tách lớp' : `Lớp ${idx + 1} / ${LAYERS.length}`
  }, [])
  useStoryTrigger(ref, { path: P_STRUCT, weights: W_STRUCT, onProgress })

  return (
    <section id="cau-truc" ref={ref} className="relative h-[520vh]">
      <div className="sticky top-0 flex h-svh items-end justify-end px-4 pb-24 md:items-center md:px-12 md:pb-0">
        <Panel className="w-full max-w-md md:!p-7">
          <Eyebrow>Advanced Structure</Eyebrow>
          <h2 className="text-2xl leading-tight font-bold text-balance sm:text-3xl md:text-4xl">
            <WordsIn text="12 lớp. Một cảm giác gõ." />
          </h2>
          <p ref={stage} className="mt-3 text-sm font-semibold text-ice-600">
            Cuộn để tách lớp
          </p>
          <div className="mt-3 min-h-[3.75rem] md:hidden" aria-live="polite">
            <AnimatePresence mode="wait">
              {active >= 0 && (
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-xl bg-white px-3 py-2 ring-1 ring-ice-100"
                >
                  <p className="text-[15px] font-semibold">{LAYERS[active].name}</p>
                  <p className="text-sm text-mute">{LAYERS[active].desc}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <ol className="mt-5 hidden space-y-0.5 md:block">
            {LAYERS.map((l, i) => {
              const on = i === active
              return (
                <motion.li
                  key={l.id}
                  layout
                  animate={{ opacity: active < 0 ? 0.85 : on ? 1 : 0.38 }}
                  transition={{ duration: 0.35 }}
                  className={`rounded-xl px-3 py-1.5 ${on ? 'bg-white ring-1 ring-ice-100 shadow-[0_10px_30px_-18px_rgba(15,27,45,0.5)]' : ''}`}
                >
                  <div className="flex items-baseline gap-3">
                    <span className="w-5 font-mono text-[11px] font-medium tabular-nums text-ice-600">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-sm font-medium md:text-[15px]">{l.name}</span>
                  </div>
                  {on && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="pl-8 text-sm text-mute"
                    >
                      {l.desc}
                    </motion.p>
                  )}
                </motion.li>
              )
            })}
          </ol>
        </Panel>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------- sound */
export function Sound() {
  const ref = useRef<HTMLElement>(null)
  const wave = useRef<HTMLDivElement>(null)
  const inView = useInView(wave, { amount: 0.5 })
  useStoryTrigger(ref, { path: P_SOUND })
  return (
    <section id="am-thanh" ref={ref} className="relative h-[200vh]">
      <div className="sticky top-0 flex h-svh flex-col items-center justify-end px-4 pb-24 text-center md:justify-start md:px-5 md:pt-32 md:pb-0">
        <Eyebrow>Gasket mount · tiêu âm 5 lớp</Eyebrow>
        <h2 className="max-w-3xl text-3xl leading-tight font-bold text-balance sm:text-4xl md:text-6xl">
          <WordsIn text="Âm trầm, gọn, không tiếng rỗng." />
        </h2>
        <p className="mt-4 max-w-xl text-sm text-mute md:mt-5 md:text-base">
          Plate và PCB treo trên gasket silicone thay vì bắt vít vào vỏ. Rung động được hấp thụ, tiếng gõ đều và êm, lực
          nhún mềm ở mọi vị trí phím.
        </p>
        <TypingDemo />
        <div ref={wave} className="mt-6 flex h-12 items-center gap-[4px] md:mt-10 md:h-16 md:gap-[5px]" aria-hidden>
          {Array.from({ length: 36 }).map((_, i) => (
            <motion.span
              key={i}
              className="w-[5px] rounded-full bg-ice-400"
              style={{ height: 64, originY: 0.5 }}
              animate={inView ? { scaleY: [0.15, 0.25 + 0.75 * Math.abs(Math.sin(i * 0.55)), 0.15] } : { scaleY: 0.15 }}
              transition={{ duration: 1.1 + (i % 5) * 0.12, repeat: inView ? Infinity : 0, delay: i * 0.03, ease: 'easeInOut' }}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

const DEMO_KEYS = ['Key_T', 'Key_H', 'Key_O', 'Key_C', 'Key_K', 'Key_SPACE', 'Key_A', 'Key_U', 'Key_L', 'Key_A', 'Key_SPACE', 'Key_F', 'Key_7_&', 'Key_5_%', 'Key_ENTER']

/** Plays a short typing burst on the 3D board (with sound turned on). */
function TypingDemo() {
  const [playing, setPlaying] = useState(false)
  const run = () => {
    if (playing) return
    setSoundEnabled(true)
    setPlaying(true)
    let t = 0
    DEMO_KEYS.forEach((k, i) => {
      t += 90 + Math.random() * 90 + (k === 'Key_SPACE' ? 60 : 0)
      setTimeout(() => {
        story.press.set(k, 1)
        story.invalidate()
      }, t)
      setTimeout(() => {
        story.press.delete(k)
        story.invalidate()
        if (i === DEMO_KEYS.length - 1) setPlaying(false)
      }, t + 95)
    })
  }
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.96 }}
      onClick={run}
      className="mt-5 flex items-center gap-2 rounded-2xl bg-ink px-6 py-3.5 font-semibold text-white md:mt-8 shadow-[0_14px_30px_-12px_rgba(15,27,45,0.6)]"
    >
      <span className={`h-2 w-2 rounded-full ${playing ? 'animate-ping bg-ice-300' : 'bg-ice-300'}`} />
      {playing ? 'Đang gõ…' : 'Nghe thử tiếng gõ'}
    </motion.button>
  )
}

/* -------------------------------------------------------------- connect */
function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.8 })
  const mv = useMotionValue(0)
  const text = useTransform(mv, (v) => new Intl.NumberFormat('vi-VN').format(Math.round(v)) + suffix)
  useEffect(() => {
    if (inView) animate(mv, to, { duration: 1.6, ease: [0.22, 1, 0.36, 1] })
  }, [inView, mv, to])
  return <motion.span ref={ref}>{text}</motion.span>
}

const MODES = [
  { t: 'Bluetooth 5.0', d: 'Ghép nhiều thiết bị, chuyển nhanh bằng phím tắt.' },
  { t: '2.4 GHz', d: 'Receiver cất ngay sau lưng bàn phím, độ trễ thấp.' },
  { t: 'Type-C', d: 'Cắm dây để chơi game hoặc sạc pin.' },
]

export function Connect() {
  const ref = useRef<HTMLElement>(null)
  useStoryTrigger(ref, { path: P_CONNECT })
  return (
    <section id="ket-noi" ref={ref} className="relative h-[240vh]">
      <div className="sticky top-0 flex h-svh flex-col justify-end px-4 pb-24 md:px-12 md:pb-28">
        <div className="grid gap-4 md:grid-cols-[1.1fr_3fr] md:items-end">
          <Reveal>
            <Eyebrow>Kết nối 3 chế độ</Eyebrow>
            <h2 className="text-2xl leading-tight font-bold text-balance sm:text-3xl md:text-4xl">
              <WordsIn text="Một bàn phím, mọi thiết bị." />
            </h2>
            <p className="mt-3 font-display text-5xl font-bold text-ice-600 tabular-nums md:mt-4 md:text-6xl">
              <Counter to={4000} /> <span className="text-2xl font-bold text-ink">mAh</span>
            </p>
          </Reveal>
          <div className="grid grid-cols-3 gap-2 md:gap-4">
            {MODES.map((m, i) => (
              <Reveal key={m.t} delay={0.1 + i * 0.1} className="h-full">
                <motion.div whileHover={{ y: -6 }} className="h-full">
                  <Panel className="h-full !p-3.5 md:!p-9">
                    <p className="text-sm font-bold md:text-lg">{m.t}</p>
                    <p className="mt-2 hidden text-sm text-mute md:block">{m.d}</p>
                  </Panel>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ rgb */
export function Rgb() {
  const ref = useRef<HTMLElement>(null)
  useStoryTrigger(ref, { path: P_RGB })
  return (
    <section id="rgb" ref={ref} className="relative h-[240vh] text-white">
      <div className="sticky top-0 flex h-svh flex-col items-center justify-end px-5 pb-28 text-center">
        <Eyebrow dark>RGB · 16,8 triệu màu</Eyebrow>
        <h2 className="text-4xl leading-tight font-bold text-balance md:text-6xl">
          <span className="bg-[linear-gradient(90deg,#ff5f6d,#ffc371,#7ef29d,#5ec8ff,#b28dff,#ff5f6d)] bg-[length:200%_100%] bg-clip-text text-transparent [animation:hue_6s_linear_infinite]">
            Sáng theo cách của bạn.
          </span>
        </h2>
        <p className="mt-4 max-w-lg text-white/70">
          Mạch xuôi đặt LED phía dưới switch, ánh sáng hắt đều qua khe phím. Nhiều hiệu ứng có sẵn, đổi ngay bằng phím tắt.
        </p>
      </div>
      <style>{`@keyframes hue { to { background-position: 200% 0 } }`}</style>
    </section>
  )
}

/* ---------------------------------------------------------- specs + buy */
export function Specs() {
  const ref = useRef<HTMLElement>(null)
  useStoryTrigger(ref, { path: P_OUTRO, start: 'top bottom', end: 'top top', edge: 'last' })
  return (
    <section id="thong-so" ref={ref} className="front relative bg-paper/80 px-5 py-28 backdrop-blur-sm md:px-12">
      <div className="mx-auto max-w-6xl">
        <Eyebrow>Thông số kỹ thuật</Eyebrow>
        <h2 className="text-3xl font-bold md:text-5xl">
          <WordsIn text="Mọi thứ bạn cần biết." />
        </h2>
        <dl className="mt-12 grid gap-px overflow-hidden rounded-3xl bg-ice-100 ring-1 ring-ice-100 sm:grid-cols-2 lg:grid-cols-3">
          {SPECS.map((s, i) => (
            <Reveal key={s.k} delay={(i % 3) * 0.06} y={20} className="bg-white/90 p-6">
              <dt className="font-mono text-[11px] tracking-[0.16em] text-mute uppercase">{s.k}</dt>
              <dd className="mt-2 font-display text-xl font-semibold">{s.v}</dd>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  )
}

export function Buy() {
  return (
    <section id="mua-ngay" className="front relative bg-paper px-5 pt-10 pb-28 md:px-12">
      <div className="mx-auto grid max-w-6xl items-center gap-10 overflow-hidden rounded-[2rem] bg-ink p-8 text-white md:grid-cols-2 md:p-14">
        <div>
          <Eyebrow dark>Sẵn sàng giao hàng</Eyebrow>
          <h2 className="text-4xl font-bold md:text-5xl">
            <WordsIn text={PRODUCT.name} />
          </h2>
          <p className="mt-2 text-white/60">{PRODUCT.variant}</p>
          <p className="mt-8 font-display text-5xl font-bold">{PRODUCT.price ? formatVnd(PRODUCT.price) : 'Liên hệ'}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <motion.a
              href={PRODUCT.buyUrl}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="rounded-2xl bg-ice-300 px-7 py-4 font-bold text-ink"
            >
              Đặt mua ngay
            </motion.a>
            <motion.a
              href={PRODUCT.contactUrl}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="rounded-2xl px-7 py-4 font-semibold ring-1 ring-white/25"
            >
              Tư vấn
            </motion.a>
          </div>
        </div>
        <ul className="grid gap-3">
          {['Gasket mount, tiêu âm 5 lớp', 'Hot-swap 5 pin, mạch xuôi', 'Keycap PBT double-shot', 'Bluetooth · 2.4 GHz · Type-C', 'Pin 4000 mAh, RGB'].map(
            (t, i) => (
              <Reveal key={t} delay={i * 0.07} y={16}>
                <li className="flex items-center gap-3 rounded-2xl bg-white/5 px-5 py-4 ring-1 ring-white/10">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ice-300 text-xs font-bold text-ink">✓</span>
                  {t}
                </li>
              </Reveal>
            ),
          )}
        </ul>
      </div>
      <footer className="mx-auto mt-16 flex max-w-6xl flex-col justify-between gap-3 text-sm text-mute md:flex-row">
        <p>© {new Date().getFullYear()} {PRODUCT.name}. Hình ảnh sản phẩm dựng 3D minh hoạ.</p>
        <p>Bàn phím cơ 75% · Gasket mount</p>
      </footer>
    </section>
  )
}
