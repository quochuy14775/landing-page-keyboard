// Nội dung bán hàng – sửa tại đây, không cần đụng vào component.
export const PRODUCT = {
  name: 'AULA F75',
  tagline: 'Gõ êm. Âm trầm. Hoàn thiện như custom.',
  // null = hiển thị "Liên hệ". Điền số (VND) khi đã chốt giá, ví dụ 1290000.
  price: null as number | null,
  buyUrl: '#mua-ngay',
  contactUrl: '#lien-he',
  variant: 'Ice Blue Gradient · Leobog Reaper',
}

export const LAYERS = [
  { id: 'L_Knob', name: 'Núm nhôm CNC', desc: 'Điều chỉnh âm lượng, vòng nhôm tiện nguyên khối.' },
  { id: 'L_Keycaps', name: 'Keycap PBT double-shot', desc: 'Hai lớp nhựa đúc, chữ in mặt trước, không bóng, không mờ.' },
  { id: 'L_UpperCover', name: 'Khung trên', desc: 'Ôm sát cụm phím, khe đèn báo tích hợp.' },
  { id: 'L_Switches', name: 'Switch Leobog Reaper', desc: 'Linear, hot-swap 5 pin, thay tay không cần hàn.' },
  { id: 'L_Plate', name: 'Plate PC xẻ rãnh', desc: 'Polycarbonate flex-cut, độ nhún mềm khi gõ.' },
  { id: 'L_PO_Foam', name: 'Foam PO tiêu âm', desc: 'Hấp thụ âm dội từ plate.' },
  { id: 'L_IXPE_Pad', name: 'Pad IXPE', desc: 'Lót dưới switch, cho tiếng gõ đầy và trầm.' },
  { id: 'L_PET_Pad', name: 'Pad PET', desc: 'Màng mỏng cách âm, bảo vệ mạch.' },
  { id: 'L_PCB', name: 'PCB xẻ rãnh từng phím', desc: 'Mạch xuôi, socket hot-swap, LED RGB.' },
  { id: 'L_PO_BaseFoam', name: 'Foam PO đáy', desc: 'Lấp khoang rỗng, triệt tiêu tiếng vang.' },
  { id: 'L_Silicone_Mat', name: 'Lót silicone', desc: 'Tăng trọng lượng, khử tiếng nhựa rỗng.' },
  { id: 'L_BottomCase', name: 'Vỏ đáy', desc: 'Kết nối 3 chế độ, chân kê gập.' },
] as const

export const SPECS = [
  { k: 'Layout', v: '75% · 80 phím + núm' },
  { k: 'Cấu trúc', v: 'Gasket mount' },
  { k: 'Tiêu âm', v: '5 lớp' },
  { k: 'Plate', v: 'PC flex-cut' },
  { k: 'Switch', v: 'Leobog Reaper · hot-swap 5 pin' },
  { k: 'Keycap', v: 'PBT double-shot · Cherry' },
  { k: 'Kết nối', v: 'Bluetooth 5.0 · 2.4 GHz · Type-C' },
  { k: 'Pin', v: '4000 mAh' },
  { k: 'Đèn nền', v: 'RGB 16,8 triệu màu' },
  { k: 'Tương thích', v: 'Windows · macOS · Android · iOS' },
]
