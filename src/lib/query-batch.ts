type BatchResults<T extends readonly (() => Promise<unknown>)[]> = {
  [K in keyof T]: Awaited<ReturnType<T[K]>>;
};

/** Run async tasks in small batches to avoid exhausting Supabase connection pools */
export async function runInBatches<T extends readonly (() => Promise<unknown>)[]>(
  tasks: T,
  batchSize = 2
): Promise<BatchResults<T>> {
  const results: unknown[] = [];
  for (let i = 0; i < tasks.length; i += batchSize) {
    const slice = tasks.slice(i, i + batchSize);
    const batchResults = await Promise.all(slice.map((task) => task()));
    results.push(...batchResults);
  }
  return results as BatchResults<T>;
}
