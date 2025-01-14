'use client'

import { Card } from "@/components/ui/card";
import { MyAssistantModal } from "@/components/assistant-ui/assistant-modal";
import { DiversityAiProvider } from "./providers/diversity-ai-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScorecardInput, ScorecardResult } from "@/types/scorecard";
import { useCurrentScorecard, useScorecardHistory } from "@/stores/scorecard-store";
import { ScorecardForm } from "@/components/scorecard/form";
import { ScorecardDisplay } from "@/components/scorecard/display";
import { ScorecardList } from "@/components/scorecard/scorecard-list";
import { ScorecardServiceProvider } from "@/providers/service-provider";
import { useScorecardDb } from "@/hooks/use-scorecard-db";
import { useEffect, useState } from 'react';
import { DatabaseProvider, useDatabase } from '@/providers/database-provider';
import type { Database } from '@/database/.client/db';
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

function ErrorAlert({ message }: { message: string | Error }) {
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{message instanceof Error ? message.message : message}</AlertDescription>
    </Alert>
  );
}

function HomePageContent() {
  const { loadHistory, saveDraft, saveScorecard } = useScorecardDb();
  const { 
    currentInput, 
    currentResult, 
    isSaving,
    setCurrentInput,
    setCurrentResult,
    setSaving,
  } = useCurrentScorecard();

  const {
    historyLoading: isLoading,
    historyError: error,
    historyInitialized,
    initializeStore,
    setError
  } = useScorecardHistory();

  useEffect(() => {
    if (!historyInitialized) {
      initializeStore().catch(console.error);
    }
  }, [historyInitialized, initializeStore]);

  const handleSubmit = async (input: ScorecardInput) => {
    setCurrentInput(input);
    try {
      const result = {} as ScorecardResult;
      await saveScorecard(input, result);
      setCurrentResult(result);
      setError(null);
      await loadHistory();
    } catch (error) {
      console.error('Error calculating scorecard:', error);
      setError(error instanceof Error ? error : new Error('Failed to calculate scorecard'));
    }
  };

  const handleSave = async (input: ScorecardInput) => {
    setSaving(true);
    try {
      await saveDraft(input);
      await loadHistory();
      setError(null);
    } catch (error) {
      console.error('Error saving scorecard:', error);
      setError(error instanceof Error ? error : new Error('Failed to save scorecard'));
    } finally {
      setSaving(false);
    }
  };

  const formInitialData: ScorecardInput | null = currentInput;
  const displayResult: ScorecardResult | null = currentResult;

  return (
    <div className="flex-1 flex">
      <aside className="w-80 border-r p-4 shrink-0">
        <ScorecardList />
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-4 max-w-7xl">
          {error && <ErrorAlert message={error.message} />}

          <div className="flex flex-col gap-8">
            <Card className="p-6">
              <ScorecardForm 
                submitAction={handleSubmit}
                saveAction={handleSave}
                isLoading={isLoading}
                isSaving={isSaving}
                initialData={formInitialData} 
              />
            </Card>

            {displayResult && (
              <Card className="p-6">
                <ScorecardDisplay 
                  result={displayResult}
                />
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function AppContent() {
  const { isInitialized, isLoading, error, db } = useDatabase();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <ScorecardServiceProvider 
        value={{ 
          db, 
          isInitialized,
          isInitializing: isLoading,
          error,
          getMarkdownReport: async (scorecardId: string) => {
            // Fetch scorecard data and generate markdown
            const response = await fetch(`/api/report?id=${scorecardId}`);
            if (!response.ok) {
              throw new Error('Failed to generate markdown report');
            }
            return response.text();
          },
          generatePDF: async (markdown: string) => {
            // Convert markdown to PDF using the PDF API
            const response = await fetch('/api/pdf', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ markdown }),
            });
            
            if (!response.ok) {
              throw new Error('Failed to generate PDF');
            }
            
            const buffer = await response.arrayBuffer();
            return Buffer.from(buffer);
          }
        }}
      >
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <h1 className="text-xl font-semibold">Initializing Database</h1>
                <p className="text-muted-foreground">Please wait while we set things up...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="p-4">
                <h1 className="text-red-500 text-xl font-semibold mb-2">Error initializing database</h1>
                <pre className="p-4 bg-gray-100 rounded">{error.message}</pre>
              </div>
            </div>
          ) : (
            <ErrorBoundary>
              <HomePageContent />
              <DiversityAiProvider>
                <MyAssistantModal />
              </DiversityAiProvider>
            </ErrorBoundary>
          )}
      </ScorecardServiceProvider>
      <Footer />
    </div>
  );
}

export default function Page() {
  // Prevent hydration issues
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;

  return (
    <DatabaseProvider>
      <AppContent />
    </DatabaseProvider>
  );
}
