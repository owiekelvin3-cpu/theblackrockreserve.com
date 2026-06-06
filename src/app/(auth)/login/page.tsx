import { Suspense } from "react";
import LoginForm from "@/components/auth/LoginForm";
import Skeleton from "@/components/ui/Skeleton";

export const metadata = {
  title: "Sign In",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full rounded-2xl" />}>
      <LoginForm />
    </Suspense>
  );
}
