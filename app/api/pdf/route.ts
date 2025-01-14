import { mkdir, writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import 'server-only';

const css = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    line-height: 1.6;
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 1rem 0;
  }
  th, td {
    border: 1px solid #ddd;
    padding: 8px;
    text-align: left;
  }
  th {
    background-color: #f5f5f5;
  }
  h1, h2, h3 {
    color: #2c3e50;
  }
  .mermaid {
    margin: 1rem 0;
  }
  code {
    background-color: #f5f5f5;
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-family: monospace;
  }
  pre {
    background-color: #f5f5f5;
    padding: 1em;
    border-radius: 5px;
    overflow-x: auto;
  }
  img {
    max-width: 100%;
    height: auto;
  }
  ul, ol {
    padding-left: 2em;
  }
  li {
    margin: 0.5em 0;
  }
  blockquote {
    border-left: 4px solid #ddd;
    margin: 0;
    padding-left: 1em;
    color: #666;
  }
`;

// Get the PDF storage directory from environment variable
const PDF_STORAGE_DIR = process.env.PDF_STORAGE_DIR || './storage/pdf';

// Ensure the PDF storage directory exists
async function ensureStorageDir() {
  if (!existsSync(PDF_STORAGE_DIR)) {
    await mkdir(PDF_STORAGE_DIR, { recursive: true });
  }
}

// Get the file path for a scorecard PDF
function getPdfPath(scorecardId: string): string {
  return join(PDF_STORAGE_DIR, `${scorecardId}.pdf`);
}

export async function POST(req: Request) {
  try {
    const { markdown, scorecardId } = await req.json();

    if (!markdown || typeof markdown !== 'string' || !scorecardId) {
      return Response.json(
        { error: 'Invalid request. Markdown content and scorecardId are required.' },
        { status: 400 }
      );
    }

    const { mdToPdf } = await import('md-to-pdf');
    
    const pdf = await mdToPdf(
      { content: markdown },
      {
        launch_options: { 
          args: ['--no-sandbox']
        },
        pdf_options: {
          format: 'A4',
          margin: {
            top: '20mm',
            right: '20mm',
            bottom: '20mm',
            left: '20mm'
          },
          printBackground: true,
          preferCSSPageSize: true
        },
        stylesheet: [css],
        marked_options: {
          mangle: false,
          headerIds: false
        }
      }
    );

    // Ensure storage directory exists
    await ensureStorageDir();

    // Save the PDF file
    const pdfPath = getPdfPath(scorecardId);
    await writeFile(pdfPath, pdf.content);

    // Return the URL for the saved PDF
    const pdfUrl = `/api/pdf/${scorecardId}`;
    return Response.json({ url: pdfUrl });

  } catch (error) {
    console.error('PDF generation error:', error);
    return Response.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    // Extract scorecard ID from the URL
    const url = new URL(req.url);
    const scorecardId = url.pathname.split('/').pop();

    if (!scorecardId) {
      return Response.json(
        { error: 'Scorecard ID is required' },
        { status: 400 }
      );
    }

    // Get the PDF file path
    const pdfPath = getPdfPath(scorecardId);

    // Check if file exists
    if (!existsSync(pdfPath)) {
      return Response.json(
        { error: 'PDF not found' },
        { status: 404 }
      );
    }

    // Read the PDF file
    const pdfContent = await readFile(pdfPath);

    // Return the PDF with appropriate headers
    return new Response(pdfContent, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="diversity-report-${scorecardId}.pdf"`,
        'Cache-Control': 'public, max-age=31536000'
      }
    });

  } catch (error) {
    console.error('PDF retrieval error:', error);
    return Response.json(
      { error: 'Failed to retrieve PDF' },
      { status: 500 }
    );
  }
}
