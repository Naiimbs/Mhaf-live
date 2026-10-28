import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card text-card-foreground">
      <div className="container max-w-7xl px-4 py-8 sm:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5 font-bold tracking-tight">
              <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/60">
                <Image src="/mhaf-logo.webp" alt="MHAF Live" width={28} height={28} className="h-full w-full object-contain" />
              </span>
              <span className="text-sm font-extrabold">MHAF <span className="font-medium text-muted-foreground">LIVE</span></span>
            </Link>
            <p className="mt-2 max-w-md text-xs leading-5 text-muted-foreground">A calendar and video-meeting workspace for bookings, scheduled conversations, and instant calls.</p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <Link href="/register" className="hover:text-foreground">Create account</Link>
            <Link href="/login" className="hover:text-foreground">Sign in</Link>
            <Link href="#workflow" className="hover:text-foreground">How it works</Link>
          </nav>
        </div>
        <div className="mt-6 border-t border-border pt-4 text-[11px] text-muted-foreground">© {new Date().getFullYear()} MHAF Live</div>
      </div>
    </footer>
  );
}
