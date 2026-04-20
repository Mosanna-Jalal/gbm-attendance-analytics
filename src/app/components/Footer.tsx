export default function Footer() {
  return (
    <footer className="mt-16 border-t border-foreground/10 bg-foreground/[0.02]">
      <div className="max-w-6xl mx-auto px-4 py-6 pr-4 sm:pr-56 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-foreground/70">
        <div className="whitespace-nowrap">
          Designed &amp; Developed by{" "}
          <a
            href="https://me-mj.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="brand-gradient-text font-semibold hover:underline"
          >
            Mosanna Jalal
          </a>
        </div>
        <div className="text-xs text-foreground/60 text-center sm:text-right">
          <span className="font-bold brand-gradient-text">MJX Web Studio</span>
          <span className="mx-2 text-foreground/30">·</span>
          <span>© {new Date().getFullYear()} All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
