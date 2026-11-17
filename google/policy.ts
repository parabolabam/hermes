export type Cell = string | number | boolean;
export type Matrix = Cell[][];
export function isNewMail(internalDate: string, cutoff: number): boolean {
  if (!/^\d+$/.test(internalDate) || !Number.isSafeInteger(cutoff)) throw new Error('invalid date');
  const date = Number(internalDate);
  if (!Number.isSafeInteger(date)) throw new Error('invalid date');
  return date >= cutoff;
}
export function validateLabel(label: string): string {
  if (!/^Hermes\/[A-Za-z0-9][A-Za-z0-9 _./-]{0,100}$/.test(label)) throw new Error('invalid label');
  return label;
}
export interface Draft { to: string[]; cc?: string[]; subject: string; text: string; reply_to_message_id?: string }
export function validateDraft(draft: Draft): void {
  if (!Array.isArray(draft.to) || draft.to.length === 0 || !Array.isArray(draft.cc ?? [])) throw new Error('invalid recipients');
  for (const address of [...draft.to, ...(draft.cc ?? [])]) {
    if (typeof address !== 'string' || address.length>254) throw new Error('invalid recipient');
    const parts=address.split('@'); const local=parts[0],domain=parts[1];
    if(parts.length!==2||!local||local.length>64||!domain||! /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/.test(local)||domain.split('.').some(label=>! /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(label)))throw new Error('invalid recipient');
  }
  if (typeof draft.subject !== 'string' || !draft.subject.trim() || /[\r\n\x00-\x1f\x7f]/.test(draft.subject) || typeof draft.text !== 'string' || !draft.text.trim()) throw new Error('invalid draft');
}
export function rangeShape(range: string): [number, number] {
  const m = /^(?:[A-Za-z0-9_ -]+|'(?:[^']|'')+')!([A-Z]+)([1-9]\d*):([A-Z]+)([1-9]\d*)$/.exec(range);
  if (!m) throw new Error('invalid range');
  const column = (s: string): number => [...s].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0);
  const width = column(m[3]!) - column(m[1]!) + 1;
  const height = Number(m[4]) - Number(m[2]) + 1;
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 || width * height > 1000) throw new Error('invalid range');
  return [height, width];
}
function normalize(values: Matrix, height: number, width: number, exact: boolean): Matrix {
  if (!Array.isArray(values) || values.length > height || (exact && values.length !== height)) throw new Error('invalid dimensions');
  return Array.from({length: height}, (_, row) => {
    const cells = row < values.length ? values[row] : [];
    if (!Array.isArray(cells)) throw new Error('invalid dimensions');
    if (!Array.isArray(cells) || cells.length > width || (exact && cells.length !== width)) throw new Error('invalid dimensions');
    return Array.from({length: width}, (_, col) => {
      const value: unknown = col < cells.length ? cells[col] : '';
      if (typeof value !== 'string' && typeof value !== 'boolean' && (typeof value !== 'number' || !Number.isFinite(value))) throw new Error('invalid cell');
      return value;
    });
  });
}
export function validateSubmitted(values: Matrix,height:number,width:number):void {normalize(values,height,width,true);}
export function validateWrite(actual: Matrix, expected: Matrix, values: Matrix, height: number, width: number): void {
  const before = normalize(actual, height, width, false);
  const comparison = normalize(expected, height, width, false);
  const after = normalize(values, height, width, true);
  for (let r = 0; r < height; r++) for (let c = 0; c < width; c++) {
    const old = before[r]![c]!; const wanted = comparison[r]![c]!; const next = after[r]![c]!;
    if (old !== wanted) throw new Error('conflict');
    if (typeof old === 'string' && old.startsWith('=')) throw new Error('formula protected');
    if (typeof next === 'string' && /^[\s\x00-\x1f]*[=+\-@]/.test(next)) throw new Error('formula injection');
  }
}
