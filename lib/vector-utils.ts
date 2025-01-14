/**
 * Vector type is an array of numbers
 */
export type Vector = number[];

/**
 * Convert array to vector
 */
export function arrayToVector(arr: number[]): Vector {
  return [...arr];
}

/**
 * Convert vector to array
 */
export function vectorToArray(vector: Vector): number[] {
  return [...vector];
}

/**
 * Calculate dot product of two vectors
 */
export function dotProduct(a: Vector, b: Vector): number {
  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

/**
 * Calculate magnitude (L2 norm) of a vector
 */
export function magnitude(v: Vector): number {
  return Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: Vector, b: Vector): number {
  const dot = dotProduct(a, b);
  const magA = magnitude(a);
  const magB = magnitude(b);
  return dot / (magA * magB);
}

/**
 * Normalize a vector to unit length
 */
export function normalize(vector: Vector): Vector {
  const mag = magnitude(vector);
  return vector.map(val => val / mag);
}

/**
 * Add two vectors
 */
export function addVectors(a: Vector, b: Vector): Vector {
  return a.map((val, i) => val + b[i]);
}

/**
 * Subtract vector b from vector a
 */
export function subtractVectors(a: Vector, b: Vector): Vector {
  return a.map((val, i) => val - b[i]);
}

/**
 * Calculate L2 distance between two vectors
 */
export function l2Distance(a: Vector, b: Vector): number {
  return Math.sqrt(
    a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0)
  );
}

/**
 * Generate a zero vector of specified dimensions
 */
export function zeroVector(dimensions: number): Vector {
  return new Array(dimensions).fill(0);
}

/**
 * Generate a random unit vector of specified dimensions
 */
export function randomUnitVector(dimensions: number): Vector {
  // Generate random values between -1 and 1
  const arr = Array.from({ length: dimensions }, () => Math.random() * 2 - 1);
  
  // Convert to unit vector
  const mag = Math.sqrt(arr.reduce((sum, val) => sum + val * val, 0));
  return arr.map(val => val / mag);
} 