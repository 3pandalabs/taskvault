import { Backdrop } from "@/components/Backdrop";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Wordmark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Backdrop />
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="mb-8">
          <Logo href="/login" />
        </div>
        <div className="w-full max-w-sm rounded-3xl border border-line bg-surface/90 p-6 shadow-xl shadow-black/5 backdrop-blur-sm">
          {children}
        </div>
      </div>
      <Footer />
    </div>
  );
}
