"use client";

import * as React from "react";
import Link from "next/link";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useScorecardStore } from "@/stores/scorecard-store";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center px-4 md:px-6">
        <div className="flex flex-1 items-center">
          <Link href="/" className="flex items-center">
            <span className="font-bold text-lg">
              Clinical Trial Diversity Scorecard
            </span>
          </Link>
        </div>
        <div className="flex items-center justify-end space-x-4">
          <nav className="flex items-center space-x-4">
            <ModeToggle />
            <Button onClick={() => useScorecardStore.getState().reset()} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Scorecard
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}
