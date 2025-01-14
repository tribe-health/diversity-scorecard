'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

interface AgeRangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; startAge: number; endAge: number }) => void;
  existingRanges: { startAge: number; endAge: number }[];
}

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  startAge: z.number().min(0, 'Start age must be 0 or greater'),
  endAge: z.number().min(0, 'End age must be greater than start age'),
}).refine((data) => data.endAge > data.startAge, {
  message: 'End age must be greater than start age',
  path: ['endAge'],
}).refine((_data) => {
  // Will be used to check for gaps with existing ranges
  return true;
}, {
  message: 'Age range must not create gaps with existing ranges',
  path: ['startAge'],
});

export function AgeRangeDialog({ open, onOpenChange, onSubmit, existingRanges }: AgeRangeDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      startAge: 0,
      endAge: 100,
    },
  });

  const validateAgeRange = (startAge: number, endAge: number): string | null => {
    // Sort existing ranges by startAge
    const sortedRanges = [...existingRanges].sort((a, b) => a.startAge - b.startAge);
    
    // Find where this new range would fit
    let prevRange = null;
    let nextRange = null;
    
    for (let i = 0; i < sortedRanges.length; i++) {
      if (sortedRanges[i].startAge > startAge) {
        if (i > 0) prevRange = sortedRanges[i - 1];
        nextRange = sortedRanges[i];
        break;
      }
      if (i === sortedRanges.length - 1) {
        prevRange = sortedRanges[i];
      }
    }

    // Check for overlaps and gaps
    if (prevRange && startAge !== prevRange.endAge) {
      return `This creates a gap with the previous range (${prevRange.startAge}-${prevRange.endAge})`;
    }
    if (nextRange && endAge !== nextRange.startAge) {
      return `This creates a gap with the next range (${nextRange.startAge}-${nextRange.endAge})`;
    }

    return null;
  };

  const handleSubmit = form.handleSubmit((data) => {
    const error = validateAgeRange(data.startAge, data.endAge);
    if (error) {
      form.setError('startAge', { message: error });
      return;
    }
    onSubmit(data);
    form.reset();
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Age Range</DialogTitle>
          <DialogDescription>
            Create a new age range category. Ranges must connect with existing ranges to avoid gaps.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Young Adult" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="startAge"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Age</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={e => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endAge"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Age</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={e => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit">Add Range</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
