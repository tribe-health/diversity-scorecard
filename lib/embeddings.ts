'use client';

export async function getEmbeddings(text: string): Promise<number[]> {
  try {
    const response = await fetch('/api/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      throw new Error(`Failed to get embeddings: ${response.status} ${response.statusText}`);
    }

    const { embeddings } = await response.json();
    return embeddings[0];
  } catch (error) {
    console.error('Error getting embeddings:', error);
    throw error;
  }
}

export async function getMultipleEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const response = await fetch('/api/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: texts.join('\n') })
    });

    if (!response.ok) {
      throw new Error(`Failed to get embeddings: ${response.status} ${response.statusText}`);
    }

    const { embeddings } = await response.json();
    return embeddings;
  } catch (error) {
    console.error('Error getting multiple embeddings:', error);
    throw error;
  }
}

export type { };
