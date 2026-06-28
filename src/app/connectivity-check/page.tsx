import type { Metadata } from "next";
import ConnectivityCheckPage from "./ConnectivityCheckPage";

export const metadata: Metadata = {
  title: "Connectivity check",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ConnectivityCheckPage />;
}
