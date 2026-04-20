import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-background/60 border-b border-foreground/10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="w-9 h-9 rounded-xl brand-gradient grid place-items-center text-white">GBM</span>
          <span className="brand-gradient-text">Attendance Portal</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-3 text-sm">
          <Link href="/submit" className="px-3 py-1.5 rounded-lg hover:bg-foreground/5">
            Submit
          </Link>
          <Link href="/" className="px-3 py-1.5 rounded-lg hover:bg-foreground/5">
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
