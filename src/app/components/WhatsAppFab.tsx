import Link from "next/link";

export default function WhatsAppFab() {
  const msg = encodeURIComponent("Hi, I need support with GBM Analytics.");
  return (
    <Link
      href={`https://wa.me/919065401524?text=${msg}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contact support on WhatsApp"
      className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 px-4 py-3 rounded-full shadow-lg text-white font-semibold text-sm hover:scale-105 active:scale-95 transition"
      style={{ background: "linear-gradient(135deg,#25d366,#128c7e)" }}
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M20.52 3.48A11.88 11.88 0 0012.02 0C5.43 0 .07 5.36.07 11.94c0 2.1.55 4.15 1.6 5.96L0 24l6.27-1.64a11.9 11.9 0 005.75 1.47h.01c6.58 0 11.94-5.36 11.94-11.94 0-3.19-1.24-6.19-3.45-8.41zM12.03 21.3h-.01a9.9 9.9 0 01-5.05-1.38l-.36-.22-3.72.97 1-3.63-.24-.37a9.88 9.88 0 01-1.52-5.27c0-5.47 4.46-9.93 9.93-9.93 2.65 0 5.14 1.03 7.01 2.91a9.85 9.85 0 012.9 7.02c0 5.47-4.45 9.9-9.94 9.9zm5.45-7.42c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.58-.01c-.2 0-.52.07-.79.37s-1.04 1.02-1.04 2.49 1.07 2.89 1.22 3.09c.15.2 2.11 3.22 5.11 4.51.71.31 1.27.49 1.7.63.72.23 1.37.2 1.89.12.58-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z" />
      </svg>
      <span className="hidden sm:inline">Contact Support</span>
    </Link>
  );
}
