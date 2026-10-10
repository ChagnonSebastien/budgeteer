import Papa from 'papaparse'

export type DecimalSeparator = '.' | ','
export type Encoding = 'utf-8' | 'windows-1252'
export type DateOrder = 'ymd' | 'dmy' | 'mdy'

export const maxStoredAmount = 2_147_483_647

export interface CsvTable {
  headers: string[]
  rows: string[][]
}

export const decodeFile = async (file: File, encoding: Encoding): Promise<string> =>
  new TextDecoder(encoding).decode(await file.arrayBuffer())

export const parseCsv = (text: string, skipLines: number, hasHeader: boolean): CsvTable => {
  const body = text
    .replace(/^\uFEFF/, '')
    .split(/\r\n|\n|\r/)
    .slice(skipLines)
    .join('\n')
  const parsed = Papa.parse<string[]>(body, { skipEmptyLines: 'greedy' })
  const records = parsed.data.map((record) => record.map((cell) => cell.trim()))
  const width = records.reduce((max, record) => Math.max(max, record.length), 0)

  const headerRecord = hasHeader ? (records[0] ?? []) : []
  const headers: string[] = []
  for (let i = 0; i < width; i += 1) {
    const base = headerRecord[i] || `Column ${i + 1}`
    let name = base
    for (let n = 2; headers.includes(name); n += 1) name = `${base} (${n})`
    headers.push(name)
  }

  return { headers, rows: hasHeader ? records.slice(1) : records }
}

export const parseMinorUnits = (
  raw: string,
  decimalSeparator: DecimalSeparator,
  decimalPoints: number,
): number | null => {
  const text = raw.trim()
  if (text === '') return null

  const negative = /^\(.*\)$/.test(text) !== ((text.match(/-/g)?.length ?? 0) % 2 === 1)
  const thousandsSeparator = decimalSeparator === '.' ? ',' : '.'
  const number = text
    .replace(/[^\d.,]/g, '')
    .split(thousandsSeparator)
    .join('')
  const parts = number.split(decimalSeparator)
  if (parts.length > 2) return null

  const [whole, fraction = ''] = parts
  if (whole === '' && fraction === '') return null
  if (fraction.replace(/0+$/, '').length > decimalPoints) return null
  if (whole.replace(/^0+/, '').length > 10) return null

  const minor =
    Number(whole || '0') * 10 ** decimalPoints +
    Number(fraction.padEnd(decimalPoints, '0').slice(0, decimalPoints) || '0')
  if (minor > maxStoredAmount) return null

  return negative ? -minor : minor
}

export const parseDate = (raw: string, order: DateOrder): Date | null => {
  const match = raw.trim().match(/^(\d{1,4})\D(\d{1,2})\D(\d{1,4})/)
  if (!match) return null

  const [a, b, c] = [match[1], match[2], match[3]].map(Number)
  const [rawYear, month, day] = order === 'ymd' ? [a, b, c] : order === 'dmy' ? [c, b, a] : [c, a, b]
  const year = rawYear < 100 ? rawYear + 2000 : rawYear

  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
  return date
}

export const formatYmd = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export const sha256Hex = async (text: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}
