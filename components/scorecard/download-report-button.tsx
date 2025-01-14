import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useCallback } from 'react';
import { useScorecardService } from '@/providers/service-provider';

interface DownloadReportButtonProps {
  scorecardId: string;
  drugName: string;
}

export function DownloadReportButton({ scorecardId, drugName }: DownloadReportButtonProps) {
  const { getMarkdownReport, generatePDF } = useScorecardService();
  
  const handleDownload = useCallback(async () => {
    try {
      // First get the markdown report
      const markdown = await getMarkdownReport(scorecardId);
      
      // Generate PDF from markdown
      const pdfBuffer = await generatePDF(markdown);
      
      // Create a blob from the PDF buffer
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      
      // Create download link and trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${drugName.toLowerCase().replace(/\s+/g, '-')}-diversity-report.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download report:', error);
      // You might want to show a toast notification here
    }
  }, [scorecardId, drugName, getMarkdownReport, generatePDF]);
  
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      Download Report
    </Button>
  );
} 