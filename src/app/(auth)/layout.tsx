import Logo from "@/components/layout/Logo";
import ThemeToggle from "@/components/ui/ThemeToggle";
import AuthCopyright from "@/app/(auth)/AuthCopyright";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative">
      <div className="absolute top-5 right-4 sm:right-6 z-20">
        <ThemeToggle size="sm" />
      </div>
      <div className="brand-horizon top-[20%]" />
      <div className="relative z-10 w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo />
        </div>
        {children}
      </div>
      <AuthCopyright />
    </div>
  );
}
