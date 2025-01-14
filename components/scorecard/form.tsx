'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/combobox';
import type { ScorecardInput, DemographicInput } from '@/types/scorecard';
import { z } from 'zod';
import { Loader2, Plus, X } from 'lucide-react';
import { useSexDemographics } from '@/hooks/use-sex-demographics';
import { useAgeDemographics } from '@/hooks/use-age-demographics';
import { useRaceDemographics } from '@/hooks/use-race-demographics';
import { useEthnicityDemographics } from '@/hooks/use-ethnicity-demographics';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCallback } from 'react';
import { AgeRangeDialog } from './age-range-dialog';

interface ScorecardFormProps {
  submitAction: (data: ScorecardInput) => Promise<void>;
  saveAction: (data: ScorecardInput) => Promise<void>;
  isLoading?: boolean;
  isSaving?: boolean;
  initialData?: ScorecardInput | null;
}

type DemographicCategory = 'sex' | 'age' | 'race' | 'ethnicity';
type DiseaseIncidence = 'Increased' | 'Similar' | 'Decreased';

interface DemographicOption {
  id: string;
  name: string;
  code: string;
  index: number;
  createdAt: Date;
}

const defaultDemographicInput: DemographicInput = {
  name: '',
  code: '',
  percentage: 0,
  expectedPercentage: 0,
  numberTreated: 0,
  diseaseIncidence: 'Similar' as const
};

const diseaseIncidenceOptions: readonly DiseaseIncidence[] = ['Increased', 'Similar', 'Decreased'] as const;

// Create a basic schema for validation
const scorecardInputSchema = z.object({
  drug: z.string().min(1, "Drug name is required").trim(),
  totalParticipants: z.number().min(1, "Total participants must be greater than 0"),
  demographics: z.object({
    sex: z.array(z.object({
      code: z.string(),
      name: z.string(),
      percentage: z.number(),
      expectedPercentage: z.number(),
      numberTreated: z.number(),
      diseaseIncidence: z.enum(['Increased', 'Similar', 'Decreased'])
    })),
    age: z.array(z.object({
      code: z.string(),
      name: z.string(),
      percentage: z.number(),
      expectedPercentage: z.number(),
      numberTreated: z.number(),
      diseaseIncidence: z.enum(['Increased', 'Similar', 'Decreased'])
    })),
    race: z.array(z.object({
      code: z.string(),
      name: z.string(),
      percentage: z.number(),
      expectedPercentage: z.number(),
      numberTreated: z.number(),
      diseaseIncidence: z.enum(['Increased', 'Similar', 'Decreased'])
    })),
    ethnicity: z.array(z.object({
      code: z.string(),
      name: z.string(),
      percentage: z.number(),
      expectedPercentage: z.number(),
      numberTreated: z.number(),
      diseaseIncidence: z.enum(['Increased', 'Similar', 'Decreased'])
    }))
  })
});

// Default expected percentages based on demographic categories and codes
const useExpectedPercentages = () => {
  const getExpectedPercentage = useCallback((category: DemographicCategory, code: string): number => {
    switch (category) {
      case 'sex':
        // Assuming binary sex distribution for clinical trials
        return code.toUpperCase().includes('FEMALE') ? 51 : 49;
      case 'age':
        // Age groups based on typical clinical trial distribution
        if (code.includes('18_44')) return 35;
        if (code.includes('45_64')) return 40;
        if (code.includes('65')) return 25;
        return 33.33; // Default for unknown age groups
      case 'race':
        // Based on US Census 2020 data (approximate)
        if (code.includes('WHITE')) return 59.3;
        if (code.includes('BLACK')) return 13.6;
        if (code.includes('ASIAN')) return 6.1;
        if (code.includes('NATIVE')) return 1.3;
        if (code.includes('PACIFIC')) return 0.3;
        if (code.includes('OTHER')) return 19.4;
        return 16.67; // Default for unknown race groups
      case 'ethnicity':
        // Based on US Census 2020 data (approximate)
        if (code.includes('HISPANIC')) return 18.9;
        if (code.includes('NON_HISPANIC')) return 81.1;
        return 50; // Default for unknown ethnicity groups
      default:
        return 0;
    }
  }, []);

  return { getExpectedPercentage };
};

export function ScorecardForm({ submitAction, saveAction, isLoading: formIsLoading, isSaving, initialData }: ScorecardFormProps) {
  const { options: sexOptions = [], addOption: addSexOption, isLoading: sexIsLoading } = useSexDemographics();
  const { options: ageOptions = [], addOption: addAgeOption, isLoading: ageIsLoading } = useAgeDemographics();
  const { options: raceOptions = [], addOption: addRaceOption, isLoading: raceIsLoading } = useRaceDemographics();
  const { options: ethnicityOptions = [], addOption: addEthnicityOption, isLoading: ethnicityIsLoading } = useEthnicityDemographics();
  const { getExpectedPercentage } = useExpectedPercentages();

  const isLoading = formIsLoading || sexIsLoading || ageIsLoading || raceIsLoading || ethnicityIsLoading;

  const form = useForm<ScorecardInput>({
    resolver: zodResolver(scorecardInputSchema),
    defaultValues: initialData || {
      drug: '',
      totalParticipants: 0,
      demographics: {
        sex: [],
        age: [],
        race: [],
        ethnicity: []
      }
    },
    mode: 'onChange',
  });

  const handleSubmit = form.handleSubmit(async (formData: ScorecardInput) => {
    try {
      await submitAction(formData);
    } catch (error) {
      console.error('Form submission error:', error instanceof Error ? error.message : 'Unknown error');
      // You might want to add toast notification here
    }
  });

  const addDemographicField = (category: DemographicCategory): void => {
    const currentFields = form.getValues(`demographics.${category}`);
    form.setValue(`demographics.${category}`, [...currentFields, { ...defaultDemographicInput }]);
  };

  const removeDemographicField = (category: DemographicCategory, index: number): void => {
    const currentFields = form.getValues(`demographics.${category}`);
    form.setValue(
      `demographics.${category}`,
      currentFields.filter((_, i) => i !== index)
    );
  };

  const getDemographicOptions = (category: DemographicCategory): {
    options: DemographicOption[];
    addOption: (option: { code: string; name: string; index: number }) => Promise<void>;
  } => {
    switch (category) {
      case 'sex':
        return {
          options: sexOptions,
          addOption: addSexOption,
        };
      case 'age':
        return {
          options: ageOptions,
          addOption: (option: { code: string; name: string; index: number }) => 
            addAgeOption({ 
              ...option, 
              startAge: 0, // You should replace these with actual age values
              endAge: 100  // from your form inputs
            }),
        };
      case 'race':
        return {
          options: raceOptions,
          addOption: addRaceOption,
        };
      case 'ethnicity':
        return {
          options: ethnicityOptions,
          addOption: addEthnicityOption,
        };
      default:
        throw new Error(`Invalid demographic category: ${category}`);
    }
  };

  const getCategoryLabel = (category: DemographicCategory): string => {
    switch (category) {
      case 'sex':
        return 'Sex Category';
      case 'age':
        return 'Age Range';
      case 'race':
        return 'Race Category';
      case 'ethnicity':
        return 'Ethnicity Category';
    }
  };

  const isAllOptionsUsed = (category: DemographicCategory): boolean => {
    const currentFields = form.getValues(`demographics.${category}`);
    const { options = [] } = getDemographicOptions(category);
    const usedCodes = new Set(currentFields?.map(field => field?.code).filter(Boolean));
    return options.length > 0 && usedCodes.size >= options.length;
  };

  const [showAgeRangeDialog, setShowAgeRangeDialog] = React.useState(false);
  const [pendingAgeOption, setPendingAgeOption] = React.useState<{ value: string; index: number } | null>(null);

  const renderDemographicFields = (category: DemographicCategory) => {
    const { options, addOption } = getDemographicOptions(category);
    const fields = form.watch(`demographics.${category}`);
    const totalParticipants = form.watch('totalParticipants') as number;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium capitalize">{category} Demographics</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addDemographicField(category)}
            disabled={isAllOptionsUsed(category)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add {category.charAt(0).toUpperCase() + category.slice(1)} Category
          </Button>
        </div>
        {fields.map((_, index) => (
          <div key={index} className="flex gap-4 items-start">
            <div className="flex-1">
              <FormField
                control={form.control}
                name={`demographics.${category}.${index}.code` as const}
                render={({ field: formField }) => (
                  <FormItem>
                    <FormLabel>{getCategoryLabel(category)}</FormLabel>
                    <FormControl>
                      <Combobox
                        options={options.map(option => ({
                          label: option.name,
                          value: option.code
                        }))}
                        value={formField.value?.toString() || ''}
                        onValueChange={(value) => {
                          const selectedOption = options.find(opt => opt.code === value);
                          if (selectedOption) {
                            form.setValue(`demographics.${category}.${index}.name` as const, selectedOption.name);
                            form.setValue(`demographics.${category}.${index}.code` as const, value);
                            form.setValue(
                              `demographics.${category}.${index}.expectedPercentage` as const,
                              getExpectedPercentage(category, value)
                            );
                          }
                        }}
                        placeholder={`Select ${category.toLowerCase()} category`}
                        onCreateOption={async (value) => {
                          if (category === 'age') {
                            setPendingAgeOption({ value, index });
                            setShowAgeRangeDialog(true);
                          } else {
                            await addOption({ code: value, name: value, index: options.length });
                            form.setValue(`demographics.${category}.${index}.name` as const, value);
                            form.setValue(`demographics.${category}.${index}.code` as const, value);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex-1">
              <FormField
                control={form.control}
                name={`demographics.${category}.${index}.percentage` as const}
                render={({ field: formField }) => (
                  <FormItem>
                    <FormLabel>Actual Percentage</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={formField.value?.toString() || '0'}
                        onChange={(e) => {
                          const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                          formField.onChange(isNaN(value) ? 0 : value);
                          // Update numberTreated based on percentage and total participants
                          if (totalParticipants > 0) {
                            const treated = Math.round((value / 100) * totalParticipants);
                            form.setValue(`demographics.${category}.${index}.numberTreated` as const, treated);
                          }
                        }}
                        onFocus={(e) => e.target.select()}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex-1">
              <FormField
                control={form.control}
                name={`demographics.${category}.${index}.expectedPercentage` as const}
                render={({ field: formField }) => (
                  <FormItem>
                    <FormLabel>Expected Percentage</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={formField.value?.toString() || '0'}
                        onChange={(e) => {
                          const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                          formField.onChange(isNaN(value) ? 0 : value);
                        }}
                        onFocus={(e) => e.target.select()}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex-1">
              <FormField
                control={form.control}
                name={`demographics.${category}.${index}.numberTreated` as const}
                render={({ field: formField }) => (
                  <FormItem>
                    <FormLabel>Number Treated</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={formField.value?.toString() || '0'}
                        onChange={(e) => {
                          const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                          formField.onChange(isNaN(value) ? 0 : value);
                          // Update percentage based on numberTreated and total participants
                          if (totalParticipants > 0) {
                            const percentage = (value / totalParticipants) * 100;
                            form.setValue(`demographics.${category}.${index}.percentage` as const, percentage);
                          }
                        }}
                        onFocus={(e) => e.target.select()}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex-1">
              <FormField
                control={form.control}
                name={`demographics.${category}.${index}.diseaseIncidence` as const}
                render={({ field: formField }) => (
                  <FormItem>
                    <FormLabel>Disease Incidence</FormLabel>
                    <Select
                      value={formField.value}
                      onValueChange={formField.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select disease incidence" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {diseaseIncidenceOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mt-8"
              onClick={() => removeDemographicField(category, index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-8">
        <FormField
          control={form.control}
          name="drug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Drug Name</FormLabel>
              <FormControl>
                <Input 
                  type="text" 
                  {...field} 
                  onChange={(e) => field.onChange(e.target.value.trim())}
                  onFocus={(e) => e.target.select()}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="totalParticipants"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Total Participants</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={field.value?.toString() || '0'}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                    field.onChange(isNaN(value) ? 0 : Math.max(0, value));
                  }}
                  onFocus={(e) => e.target.select()}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {renderDemographicFields('sex')}
        {renderDemographicFields('age')}
        {renderDemographicFields('race')}
        {renderDemographicFields('ethnicity')}

        {/* Age Range Dialog */}
        <AgeRangeDialog
          open={showAgeRangeDialog}
          onOpenChange={setShowAgeRangeDialog}
          existingRanges={ageOptions.map(opt => ({ startAge: opt.startAge, endAge: opt.endAge }))}
          onSubmit={async (data) => {
            if (pendingAgeOption) {
              const { value, index } = pendingAgeOption;
              await addAgeOption({
                code: value,
                name: `${data.name} (${data.startAge}-${data.endAge})`,
                index: ageOptions.length,
                startAge: data.startAge,
                endAge: data.endAge
              });
              form.setValue(`demographics.age.${index}.name` as const, `${data.name} (${data.startAge}-${data.endAge})`);
              form.setValue(`demographics.age.${index}.code` as const, value);
              setPendingAgeOption(null);
            }
          }}
        />

        <div className="flex gap-4">
          <Button 
            type="submit" 
            disabled={isLoading || !form.formState.isValid || form.getValues('drug').length === 0 || form.getValues('totalParticipants') <= 0}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Calculate Scorecard
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            disabled={isSaving || !form.formState.isValid || form.getValues('drug').length === 0 || form.getValues('totalParticipants') <= 0}
            onClick={form.handleSubmit(async (data) => {
              try {
                await saveAction(data);
              } catch (error) {
                console.error('Save error:', error instanceof Error ? error.message : 'Unknown error');
                // You might want to add toast notification here
              }
            })}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Progress
          </Button>
        </div>
      </form>
    </Form>
  );
}
