import type { ScorecardResult, Recommendation } from '@/types/scorecard';
import type { Message } from 'ai';
import { nanoid } from 'nanoid';

export async function generateLLMRecommendations(scorecard: ScorecardResult): Promise<Recommendation[]> {
  try {
    const prompt = `Given the following clinical trial diversity scorecard, provide specific recommendations for improving diversity and inclusion. Focus on actionable steps based on the grades and demographic data.

Scorecard Summary:
Drug: ${scorecard.drug}
Overall Grade: ${scorecard.overallGrade}

Demographics:
- Sex (Grade: ${scorecard.demographics.sex.grade})
${scorecard.demographics.sex.data.map(d => `  * ${d.name}: ${d.percentage}% (Expected: ${d.expectedPercentage}%)`).join('\n')}

- Age (Grade: ${scorecard.demographics.age.grade})
${scorecard.demographics.age.data.map(d => `  * ${d.name}: ${d.percentage}% (Expected: ${d.expectedPercentage}%)`).join('\n')}

- Race (Grade: ${scorecard.demographics.race.grade})
${scorecard.demographics.race.data.map(d => `  * ${d.name}: ${d.percentage}% (Expected: ${d.expectedPercentage}%)`).join('\n')}

- Ethnicity (Grade: ${scorecard.demographics.ethnicity.grade})
${scorecard.demographics.ethnicity.data.map(d => `  * ${d.name}: ${d.percentage}% (Expected: ${d.expectedPercentage}%)`).join('\n')}

For each demographic category (sex, age, race, ethnicity) that needs improvement, provide specific recommendations with:
1. The category being addressed
2. A clear message explaining the issue and solution
3. Priority level (high/medium/low)
4. 2-3 specific action items

Format each recommendation as:
Category: [category]
Message: [recommendation text]
Priority: [priority level]
Action Items:
- [action item 1]
- [action item 2]
- [action item 3 (optional)]`;

    const messages: Message[] = [
      { role: 'user', content: prompt, id: nanoid() }
    ];

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      throw new Error('Failed to get recommendations from chat API');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body from chat API');
    }

    let result = '';
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            result += parsed.text || '';
          } catch {
            // Skip invalid JSON
            console.error('Invalid JSON:', data);
          }
        }
      }
    }

    // Parse the response into structured recommendations
    const recommendations: Recommendation[] = result.split('\n\n')
      .filter((block: string) => block.trim().startsWith('Category:'))
      .map((block: string) => {
        const lines = block.split('\n');
        const category = lines[0].replace('Category:', '').trim().toLowerCase() as 'sex' | 'age' | 'race' | 'ethnicity';
        const message = lines[1].replace('Message:', '').trim();
        const priority = lines[2].replace('Priority:', '').trim().toLowerCase() as 'high' | 'medium' | 'low';
        
        // Extract action items (skip the "Action Items:" header line)
        const actionItems = lines.slice(4)
          .filter(line => line.trim().startsWith('-'))
          .map(line => line.replace('-', '').trim());

        return {
          category,
          message,
          priority,
          actionItems
        };
      });

    return recommendations;
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return [];
  }
}
