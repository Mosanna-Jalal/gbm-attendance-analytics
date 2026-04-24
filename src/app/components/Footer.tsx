export default function Footer() {
  return (
    <footer className="mt-16 border-t border-foreground/10 bg-foreground/[0.02]">
      <div className="max-w-6xl mx-auto px-4 py-6 pr-4 sm:pr-56 grid grid-cols-1 sm:grid-cols-3 items-center gap-3 text-sm text-foreground/70">
        <div className="whitespace-nowrap text-center sm:text-left">
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
        <div className="text-center">
          <a
            href="https://me-mj.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold brand-gradient-text hover:underline"
          >
            MJX Web Studio
          </a>
        </div>
        <div className="text-xs text-foreground/60 text-center sm:text-right">
          © {new Date().getFullYear()} All rights reserved.
        </div>
      </div>
    </footer>
  );
}
