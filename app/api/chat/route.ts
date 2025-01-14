import { createAzure } from "@ai-sdk/azure";
import { streamText, convertToCoreMessages } from "ai";

export const maxDuration = 30;

const openai = createAzure({
  apiKey: process.env.AZURE_OPENAI_API_KEY!,
  baseURL: process.env.AZURE_OPENAI_API_ENDPOINT!,
  resourceName: process.env.AZURE_OPENAI_API_RESOURCE_NAME!,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION!
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai("gpt-4o"),
    messages: convertToCoreMessages(messages),
  });

  return result.toDataStreamResponse();
}
