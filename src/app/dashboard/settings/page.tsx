"use client";

import { useSession } from "next-auth/react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { toast } from "sonner";
import SecurityOptions from "@/components/dashboard/SecurityOptions";

export default function SettingsPage() {
  const { data: session } = useSession();

  return (
    <>
      <div className="space-y-6 max-w-2xl">
        <Card>
          <h2 className="font-semibold text-text-primary mb-6">Profile</h2>
          <div className="space-y-4">
            <Input label="Full Name" defaultValue={session?.user?.name || ""} />
            <Input label="Email" defaultValue={session?.user?.email || ""} disabled />
            <Input label="Phone" placeholder="+1 (555) 000-0000" />
            <Button onClick={() => toast.success("Profile updated")}>Save Changes</Button>
          </div>
        </Card>

        <div className="dash-panel p-5">
          <h2 className="font-semibold text-text-primary mb-5">Security</h2>
          <SecurityOptions />
          <Button variant="outline" className="mt-5">
            Change Password
          </Button>
        </div>

        <Card>
          <h2 className="font-semibold text-text-primary mb-6">Notifications</h2>
          <div className="space-y-3">
            {["Transaction alerts", "Investment updates", "Security notifications", "Marketing emails"].map((item) => (
              <label key={item} className="flex items-center justify-between p-3 rounded-xl hover:bg-bg-tertiary/30 transition-colors cursor-pointer">
                <span className="text-sm text-text-primary">{item}</span>
                <input type="checkbox" defaultChecked className="rounded accent-accent-gold" />
              </label>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
