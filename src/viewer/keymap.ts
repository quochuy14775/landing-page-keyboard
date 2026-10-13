import { PropertyBinding } from 'three'

// Physical keyboard (KeyboardEvent.code) -> legend label used for the key in the
// Blender model. Node names are "Key_<label with spaces as _>", sanitised by the
// glTF loader the same way as below.
const CODE_TO_LABEL: Record<string, string> = {
  Escape: 'ESC',
  Backquote: '` ~',
  Minus: '- _',
  Equal: '= +',
  Backspace: 'BKSP',
  Delete: 'DEL',
  Tab: 'TAB',
  BracketLeft: '[ {',
  BracketRight: '] }',
  Backslash: '\\ |',
  PageUp: 'PU',
  CapsLock: 'CAPS',
  Semicolon: '; :',
  Quote: "' \"",
  Enter: 'ENTER',
  NumpadEnter: 'ENTER',
  PageDown: 'PD',
  ShiftLeft: 'SHIFT',
  Comma: ', <',
  Period: '. >',
  Slash: '/ ?',
  ShiftRight: 'RSHIFT',
  ArrowUp: 'UP',
  End: 'END',
  ControlLeft: 'CTRL',
  MetaLeft: 'WIN',
  OSLeft: 'WIN',
  AltLeft: 'ALT',
  Space: 'SPACE',
  AltRight: 'FN',
  ControlRight: 'RCTRL',
  ArrowLeft: 'LEFT',
  ArrowDown: 'DOWN',
  ArrowRight: 'RIGHT',
}
const DIGITS = ['0 )', '1 !', '2 @', '3 #', '4 $', '5 %', '6 ^', '7 &', '8 *', '9 (']

export function keyNameForCode(code: string): string | null {
  let label = CODE_TO_LABEL[code]
  if (!label && code.startsWith('Key')) label = code.slice(3)
  if (!label && code.startsWith('Digit')) label = DIGITS[Number(code.slice(5))]
  if (!label && /^F([1-9]|1[0-2])$/.test(code)) label = code
  if (!label) return null
  return PropertyBinding.sanitizeNodeName('Key_' + label.replace(/ /g, '_'))
}
