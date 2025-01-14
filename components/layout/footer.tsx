export function Footer() {
  return (
    <footer className="border-t py-6 md:py-0 fixed bottom-0 left-0 right-0 bg-background z-50">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-14 md:flex-row px-6">
        <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
          Built with ❤️ for improving clinical trial diversity.{" "}
          <a
            href="https://github.com/tribehealth/diversity-scorecard"
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium underline underline-offset-4"
          >
            GitHub
          </a>
          .
        </p>
        <p className="text-center text-sm text-muted-foreground md:text-left">
          © {new Date().getFullYear()} Tribe Health Solutions, Inc. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
