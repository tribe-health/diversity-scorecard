import type { ScorecardResult, Grade } from '@/types/scorecard';
import { processTemplate } from '@/lib/report/template-engine';

// Template content as a constant
const TEMPLATE = `# Clinical Trial Diversity Report: {{ drug_name }}
**Report Generated:** {{ generated_at | date('MMMM D, YYYY') }}

## Executive Summary

{{ drug_name }}'s clinical trials demonstrate {{ grade_description[overall_grade] }} diversity across demographic categories, achieving an overall grade of {{ overall_grade }}. {% if overall_grade in ['A', 'B'] %}While representation is strong in most areas{% else %}There are significant opportunities for improvement{% endif %}, particularly in {{ weakest_category }} diversity.

## Overall Diversity Metrics

| Category | Score (0-4) | Grade | Population Level | Treatment Level |
|----------|-------------|--------|------------------|-----------------|
| Sex/Gender | {{ demographics.sex.score | number('0.00') }} | {{ demographics.sex.grade }} | {{ population_levels.sex | title }} | {{ treatment_levels.sex }} |
| Age | {{ demographics.age.score | number('0.00') }} | {{ demographics.age.grade }} | {{ population_levels.age | title }} | {{ treatment_levels.age }} |
| Race | {{ demographics.race.score | number('0.00') }} | {{ demographics.race.grade }} | {{ population_levels.race.overall | title }} | {{ treatment_levels.race.overall }} |
| Ethnicity | {{ demographics.ethnicity.score | number('0.00') }} | {{ demographics.ethnicity.grade }} | {{ population_levels.ethnicity | title }} | {{ treatment_levels.ethnicity }} |
| **Overall** | {{ (demographics.sex.score + demographics.age.score + demographics.race.score + demographics.ethnicity.score) / 4 | number('0.00') }} | {{ overall_grade }} | - | - |

## Detailed Analysis

### Sex/Gender Distribution
\`\`\`mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'pie1': '#4CAF50', 'pie2': '#2196F3', 'pie3': '#9C27B0' }}}%%
pie showData
title Sex/Gender Distribution (Grade: {{ demographics.sex.grade }})
{%- for item in demographics.sex.data %}
    "{{ item.name }} ({{ item.percentage | number('0.0') }}%)" : {{ item.percentage | number('0.0') }}
{%- endfor %}
\`\`\`

| Category | Trial % | Expected % | Difference | Individual Score | Individual Grade |
|----------|---------|------------|------------|------------------|------------------|
{%- for item in demographics.sex.data %}
| {{ item.name }} | {{ item.percentage | number('0.0') }}% | {{ item.expectedPercentage | number('0.0') }}% | {{ (item.percentage - item.expectedPercentage) | number('+0.0') }}% | {{ item.score | number('0.00') }} | {{ item.grade }} |
{%- endfor %}

### Age Distribution
\`\`\`mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#2196F3', 'secondaryColor': '#FF9800', 'tertiaryColor': '#4CAF50' }}}%%
xychart-beta
title Age Distribution (Grade: {{ demographics.age.grade }})
x-axis [{{ demographics.age.data | map(attribute='name') | join(', ') }}]
y-axis "Percentage (%)" 0 --> 100
bar [{{ demographics.age.data | map(attribute='percentage') | join(', ') }}]
line [{{ demographics.age.data | map(attribute='expectedPercentage') | join(', ') }}]
\`\`\`

| Age Group | Trial % | Expected % | Difference | Individual Score | Individual Grade |
|-----------|---------|------------|------------|------------------|------------------|
{%- for item in demographics.age.data %}
| {{ item.name }} | {{ item.percentage | number('0.0') }}% | {{ item.expectedPercentage | number('0.0') }}% | {{ (item.percentage - item.expectedPercentage) | number('+0.0') }}% | {{ item.score | number('0.00') }} | {{ item.grade }} |
{%- endfor %}

### Racial Distribution
\`\`\`mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#4CAF50', 'secondaryColor': '#FF9800', 'tertiaryColor': '#2196F3' }}}%%
xychart-beta
title Racial Distribution (Grade: {{ demographics.race.grade }})
x-axis [{{ demographics.race.data | map(attribute='code') | join(', ') }}]
y-axis "Percentage (%)" 0 --> 100
bar [{{ demographics.race.data | map(attribute='percentage') | join(', ') }}]
line [{{ demographics.race.data | map(attribute='expectedPercentage') | join(', ') }}]
\`\`\`

| Race/Ethnicity | Trial % | Expected % | Difference | Individual Score | Individual Grade |
|----------------|---------|------------|------------|------------------|------------------|
{%- for item in demographics.race.data %}
| {{ item.name }} | {{ item.percentage | number('0.0') }}% | {{ item.expectedPercentage | number('0.0') }}% | {{ (item.percentage - item.expectedPercentage) | number('+0.0') }}% | {{ item.score | number('0.00') }} | {{ item.grade }} |
{%- endfor %}

### Ethnic Distribution
\`\`\`mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'pie1': '#FF9800', 'pie2': '#9C27B0', 'pie3': '#4CAF50' }}}%%
pie showData
title Ethnic Distribution (Grade: {{ demographics.ethnicity.grade }})
{%- for item in demographics.ethnicity.data %}
    "{{ item.name }} ({{ item.percentage | number('0.0') }}%)" : {{ item.percentage | number('0.0') }}
{%- endfor %}
\`\`\`

| Ethnicity | Trial % | Expected % | Difference | Individual Score | Individual Grade |
|-----------|---------|------------|------------|------------------|------------------|
{%- for item in demographics.ethnicity.data %}
| {{ item.name }} | {{ item.percentage | number('0.0') }}% | {{ item.expectedPercentage | number('0.0') }}% | {{ (item.percentage - item.expectedPercentage) | number('+0.0') }}% | {{ item.score | number('0.00') }} | {{ item.grade }} |
{%- endfor %}

## Statistical Analysis

### Confidence Intervals and Significance

| Demographic Category | Sample Size | Confidence Interval | P-Value | Statistical Power |
|---------------------|-------------|---------------------|---------|-------------------|
| Sex/Gender | {{ statistics.totalParticipants | number }} | ±{{ statistics.confidenceIntervals.sex | number('0.00') }}% | {{ statistics.pValues.sex }} | {{ (1 - statistics.confidenceIntervals.sex) * 100 | number('0.0') }}% |
| Age | {{ statistics.totalParticipants | number }} | ±{{ statistics.confidenceIntervals.age | number('0.00') }}% | {{ statistics.pValues.age }} | {{ (1 - statistics.confidenceIntervals.age) * 100 | number('0.0') }}% |
| Race | {{ statistics.totalParticipants | number }} | ±{{ statistics.confidenceIntervals.race | number('0.00') }}% | {{ statistics.pValues.race }} | {{ (1 - statistics.confidenceIntervals.race) * 100 | number('0.0') }}% |
| Ethnicity | {{ statistics.totalParticipants | number }} | ±{{ statistics.confidenceIntervals.ethnicity | number('0.00') }}% | {{ statistics.pValues.ethnicity }} | {{ (1 - statistics.confidenceIntervals.ethnicity) * 100 | number('0.0') }}% |

### Disease Incidence Analysis

| Demographic Group | Disease Incidence | Trial Representation | Assessment |
|------------------|-------------------|---------------------|------------|
{%- for group in disease_incidence %}
| {{ group.demographic }} | {{ group.level }} | {{ group.representation }} | {{ group.assessment }} |
{%- endfor %}

## Recommendations

### Priority Areas for Improvement
{%- for rec in recommendations | selectattr('type', 'equalto', 'improvement') | selectattr('priority', 'equalto', 'high') %}
- 🔴 **High Priority**: {{ rec.text }}
{%- endfor %}
{%- for rec in recommendations | selectattr('type', 'equalto', 'improvement') | selectattr('priority', 'equalto', 'medium') %}
- 🟡 **Medium Priority**: {{ rec.text }}
{%- endfor %}
{%- for rec in recommendations | selectattr('type', 'equalto', 'improvement') | selectattr('priority', 'equalto', 'low') %}
- 🟢 **Low Priority**: {{ rec.text }}
{%- endfor %}

### Action Items
{%- for rec in recommendations | selectattr('type', 'equalto', 'action') %}
- {{ rec.text }}
{%- endfor %}

### Successful Strategies to Maintain
{%- for rec in recommendations | selectattr('type', 'equalto', 'maintain') %}
- {{ rec.text }}
{%- endfor %}

## Methodology Notes

### Grading Criteria
- **A (4.0)**: Exceeds benchmark by >10%
- **B (3.0)**: Within ±10% of benchmark
- **C (2.0)**: Below benchmark by 10-20%
- **D (1.0)**: Below benchmark by 20-30%
- **F (0.0)**: Below benchmark by >30%

### Data Sources
- Population benchmarks: 2020 U.S. Census data
- Disease incidence data: CDC and NIH reports
- Statistical significance: 95% confidence level

### Visualization Guide
The charts in this report use Mermaid.js with custom themes for better accessibility:
- Pie charts show distribution with percentages
- Bar/line charts compare trial data (bars) with benchmarks (lines)
- Colors follow WCAG 2.1 contrast guidelines
- Interactive tooltips show exact values

## References

{%- for ref in references %}
{{ loop.index }}. {{ ref }}
{%- endfor %}

---
*This report was automatically generated by the Clinical Trial Diversity Scorecard System. For questions about methodology or data sources, please contact the research team.*`;

const gradeDescriptions: Record<Grade, string> = {
  'A': 'excellent',
  'B': 'good',
  'C': 'moderate',
  'D': 'poor',
  'F': 'insufficient'
};

export async function POST(req: Request) {
  try {
    const result: ScorecardResult = await req.json();

    const markdown = processTemplate(TEMPLATE, {
      ...result,
      grade_description: gradeDescriptions,
      generated_at: new Date().toISOString()
    });

    return Response.json({ markdown });
  } catch (error) {
    console.error('Report generation error:', error);
    return Response.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
