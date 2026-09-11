/** Never present Supabase's first 1,000 rows as a complete asset library. */
export async function readAllPages<T>(read: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    const { data, error } = await read(from, from + size - 1);
    if (error) throw new Error(error.message);
    if (!data) throw new Error('The asset library returned no data. Please retry.');
    rows.push(...data);
    if (data.length < size) return rows;
  }
}
