import { NextRequest } from 'next/server';
import OpenAI from 'openai';

// Initialize Azure OpenAI client
const client = new OpenAI({
  apiKey: process.env.AZURE_API_KEY!,
  baseURL: `${process.env.AZURE_BASE_URL}/openai/deployments/${process.env.NEXT_PUBLIC_AZURE_EMBEDDING_DEPLOYMENT}`,
  defaultQuery: { 'api-version': process.env.AZURE_API_VERSION },
  defaultHeaders: { 'api-key': process.env.AZURE_API_KEY }
});

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    
    if (typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Input must be a string' }),
        { status: 400 }
      );
    }

    const result = await client.embeddings.create({
      model: process.env.NEXT_PUBLIC_AZURE_EMBEDDING_DEPLOYMENT!,
      input: text
    });

    return new Response(
      JSON.stringify({ embeddings: result.data.map(item => item.embedding) }),
      { status: 200 }
    );

  } catch (error) {
    console.error('Error generating embeddings:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate embeddings' }),
      { status: 500 }
    );
  }
}
