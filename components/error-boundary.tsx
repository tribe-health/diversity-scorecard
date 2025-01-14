'use client';

import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { resetDatabase } from '@/database/.client/db';
import { useState } from 'react';

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  const [isResetting, setIsResetting] = useState(false);

  const handleResetDatabase = async () => {
    try {
      setIsResetting(true);
      await resetDatabase();
      window.location.reload();
    } catch (error) {
      console.error('Failed to reset database:', error);
    } finally {
      setIsResetting(false);
    }
  };
  return (
    <Card className="w-full max-w-md mx-auto my-8">
      <CardHeader>
        <CardTitle className="text-destructive">Something went wrong!</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-muted-foreground">
            {error.message || 'An unexpected error occurred'}
          </p>
          {process.env.NODE_ENV === 'development' && (
            <pre className="p-4 bg-muted rounded-lg text-sm overflow-auto">
              {error.stack}
            </pre>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between gap-2">
        <Button
          variant="outline"
          onClick={() => window.location.href = '/'}
        >
          Go Home
        </Button>
        <div className="flex gap-2">
          <Button 
            variant="destructive" 
            onClick={handleResetDatabase}
            disabled={isResetting}
          >
            {isResetting ? 'Resetting...' : 'Reset Database'}
          </Button>
          <Button onClick={resetErrorBoundary}>
            Try Again
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Reset any state that might have caused the error
        window.location.reload();
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}
