import "./admin.css";

export const metadata = {
  title: "Blackrock Reserve Admin Console",
  description: "Internal administration portal for Blackrock Reserve",
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-root">
      <div className="admin-page-glow" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
