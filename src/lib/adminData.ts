import type { GymWithColors } from '@/hooks/useGyms';

/** Quoted CSV cells preserve punctuation and keep spreadsheet formulas inert. */
export function csvCell(value: string | null | undefined) {
  const text = value || '';
  // eslint-disable-next-line no-control-regex -- Spreadsheet formulas can be prefixed with invisible control characters.
  const safe = /^[\s\u0000-\u001f]*[=+@-]/.test(text) ? "'" + text : text;
  return '"' + safe.replace(/"/g, '""') + '"';
}

export function gymDataCsv(gyms: GymWithColors[]) {
  return [['Name', 'Code', 'Address', 'Phone', 'Email', 'Website', 'Colors'], ...gyms.map(gym => [gym.name, gym.code, gym.address, gym.phone, gym.email, gym.website, gym.colors.map(color => color.color_hex).join(';')])]
    .map(row => row.map(csvCell).join(',')).join('\r\n');
}
