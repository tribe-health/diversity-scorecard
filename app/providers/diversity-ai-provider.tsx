import { useChat } from 'ai/react';
import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { useVercelUseChatRuntime } from '@assistant-ui/react-ai-sdk';
import { useCallback, useEffect, useState } from 'react';
import { useSimilarScorecards } from '@/hooks/use-similar-scorecards';
import type { ScorecardResult, DemographicData, Grade, Recommendation, DemographicResult } from '@/types/scorecard';

const BASE_SYSTEM_MESSAGE = `You are an expert assistant specializing in clinical trial diversity analysis. Your role is to help users understand and evaluate the diversity of clinical trials using a standardized scorecard system.

Your key responsibilities include:
1. Analyzing demographic representation in clinical trials
2. Explaining diversity scores and grades
3. Providing recommendations for improving trial diversity
4. Answering questions about specific trials and their diversity metrics

When discussing scorecards, focus on:
- Overall diversity grade and score
- Demographic breakdowns (sex, age, race, ethnicity)
- Areas needing improvement
- Specific recommendations provided

If no scorecards are available for reference, you can still:
- Explain general principles of clinical trial diversity
- Discuss industry benchmarks and standards
- Share best practices for improving trial diversity
- Answer general questions about the scoring methodology`;

export function DiversityAiProvider({ children }: { children: React.ReactNode }) {
  const [similarScorecards, setSimilarScorecards] = useState<ScorecardResult[]>([]);
  const { findSimilarScorecards } = useSimilarScorecards();

  const chat = useChat({
    api: '/api/chat',
    initialMessages: [],
    body: {
      systemMessage: getSystemMessage(similarScorecards)
    }
  });

  const updateSimilarScorecards = useCallback(async (query: string) => {
    const results = await findSimilarScorecards(query);
    setSimilarScorecards(results);
  }, [findSimilarScorecards]);

  useEffect(() => {
    if (chat.messages.length > 0) {
      const lastMessage = chat.messages[chat.messages.length - 1];
      if (lastMessage.role === 'user') {
        updateSimilarScorecards(lastMessage.content);
      }
    }
  }, [chat.messages, updateSimilarScorecards]);

  const runtime = useVercelUseChatRuntime(chat);
  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}

function formatDemographicData(data: DemographicData): string {
  return data.data
    .map((d: DemographicResult) => `${d.name} (${d.percentage}% vs expected ${d.expectedPercentage}%, Grade: ${d.grade})`)
    .join('; ');
}

function formatGrade(grade: Grade): string {
  return grade;
}

function getSystemMessage(scorecards: ScorecardResult[]): string {
  let message = BASE_SYSTEM_MESSAGE;

  if (scorecards.length > 0) {
    message += '\n\nRelevant clinical trial scorecards for reference:\n\n';
    scorecards.forEach((scorecard, index) => {
      message += `${index + 1}. ${scorecard.drug} Trial:\n`;
      message += `   - Overall Grade: ${formatGrade(scorecard.overallGrade)}\n`;
      message += `   - Sex Demographics: ${formatDemographicData(scorecard.demographics.sex)}\n`;
      message += `   - Age Demographics: ${formatDemographicData(scorecard.demographics.age)}\n`;
      message += `   - Race Demographics: ${formatDemographicData(scorecard.demographics.race)}\n`;
      message += `   - Ethnicity Demographics: ${formatDemographicData(scorecard.demographics.ethnicity)}\n`;
      message += `   - Key Recommendations: ${scorecard.recommendations.map((r: Recommendation) => r.message).join('; ')}\n\n`;
    });
  }

  return message;
}