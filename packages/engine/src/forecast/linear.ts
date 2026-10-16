/** 95% normal quantile used by both forecast fits. */
export const Z = 1.96;

export function design(index: number, seasonAt: number, season: number): number[] {
  const row = [1, index];
  if (season > 1) {
    for (let slot = 1; slot < season; slot += 1) row.push(seasonAt === slot ? 1 : 0);
  }
  return row;
}

export function ordinaryLeastSquares(rows: number[][], y: number[]): number[] | null {
  const width = rows[0]?.length ?? 0;
  if (!width || rows.length < width) return null;
  const xtx = Array.from({ length: width }, () => Array.from({ length: width }, () => 0));
  const xty = Array.from({ length: width }, () => 0);
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    for (let left = 0; left < width; left += 1) {
      xty[left] += row[left] * y[rowIndex];
      for (let right = 0; right < width; right += 1) xtx[left][right] += row[left] * row[right];
    }
  }
  for (let index = 0; index < width; index += 1) xtx[index][index] += 1e-8;
  return solve(xtx, xty);
}

function solve(matrix: number[][], vector: number[]): number[] | null {
  const size = vector.length;
  const rows = matrix.map((row, index) => [...row, vector[index]]);
  for (let col = 0; col < size; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < size; row += 1) {
      if (Math.abs(rows[row][col]) > Math.abs(rows[pivot][col])) pivot = row;
    }
    const swap = rows[col];
    rows[col] = rows[pivot];
    rows[pivot] = swap;
    const scale = rows[col][col];
    if (Math.abs(scale) < 1e-10) return null;
    for (let colIndex = col; colIndex <= size; colIndex += 1) rows[col][colIndex] /= scale;
    for (let row = 0; row < size; row += 1) {
      if (row === col) continue;
      const factor = rows[row][col];
      for (let colIndex = col; colIndex <= size; colIndex += 1) rows[row][colIndex] -= factor * rows[col][colIndex];
    }
  }
  return rows.map((row) => row[size]);
}

export function dot(left: number[], right: number[]): number {
  return left.reduce((sum, value, index) => sum + value * right[index], 0);
}

export function seasonIndex(period: string, season: number): number {
  if (season === 7) {
    const date = new Date(`${period.slice(0, 10)}T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? 0 : date.getUTCDay();
  }
  if (season === 12) {
    const month = Number(period.slice(5, 7));
    return Number.isFinite(month) ? month - 1 : 0;
  }
  return 0;
}
