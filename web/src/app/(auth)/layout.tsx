import { Backdrop } from "@/components/Backdrop";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Wordmark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Backdrop />
      <div className="flex flex-1 flex-col items-center px-4 py-16 sm:px-6">
        <div className="mb-8">
          <Logo href="/login" />
        </div>
        <div className="w-full max-w-md rounded-xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm sm:p-6">
          {children}
        </div>
      </div>
      <Footer />
    </div>
  );
}
