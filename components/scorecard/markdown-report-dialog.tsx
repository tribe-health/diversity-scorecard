"use client";

import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { useEffect, useRef } from "react";
import mermaid from "mermaid";

interface MarkdownReportDialogProps {
  markdown: string;
}

export function MarkdownReportDialog({ markdown }: MarkdownReportDialogProps) {
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!hasInitialized.current) {
      mermaid.initialize({
        startOnLoad: true,
        theme: 'neutral',
        securityLevel: 'loose',
        fontFamily: 'inherit',
      });
      hasInitialized.current = true;
    }

    // Process any mermaid diagrams after the content updates
    mermaid.contentLoaded();
  }, [markdown]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">View Detailed Report</Button>
      </DialogTrigger>
      <DialogContent className="w-[70vw] h-[70vh] max-w-[1200px]">
        <ScrollArea className="h-full pr-4">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={{
                // Handle code blocks with mermaid
                code: ({ className, children, ...props }) => {
                  if (className === 'language-mermaid') {
                    return (
                      <div className="mermaid">
                        {String(children).trim()}
                      </div>
                    );
                  }
                  return <code className={className} {...props}>{children}</code>;
                },
                // Handle pre tags with mermaid class
                pre: ({ children, className, ...props }) => {
                  if (className === 'mermaid') {
                    return (
                      <div className="mermaid">
                        {/* @ts-expect-error children prop type from ReactMarkdown */}
                        {children?.props?.children || ''}
                      </div>
                    );
                  }
                  return <pre className={className} {...props}>{children}</pre>;
                },
              }}
            >
              {markdown}
            </ReactMarkdown>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
