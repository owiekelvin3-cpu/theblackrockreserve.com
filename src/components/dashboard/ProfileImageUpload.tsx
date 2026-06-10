"use client";

import { useCallback, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useProfileImage } from "@/components/providers/ProfileImageProvider";
import { Camera, Upload, Trash2, ZoomIn } from "lucide-react";
import { toast } from "sonner";
import ProfileAvatar from "@/components/ui/ProfileAvatar";
import Button from "@/components/ui/Button";
import { useI18n } from "@/components/providers/I18nProvider";
import { processProfileImageFile } from "@/lib/profile-image";

interface ProfileImageUploadProps {
  initialImage?: string | null;
  onUpdated?: (image: string | null) => void;
}

export default function ProfileImageUpload({ initialImage, onUpdated }: ProfileImageUploadProps) {
  const { data: session } = useSession();
  const { refresh, setImage: setProfileImage } = useProfileImage();
  const { t } = useI18n();
  const [image, setImage] = useState<string | null>(initialImage ?? null);
  const [preview, setPreview] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File | undefined) => {
    if (!file) return;
    setPendingFile(file);
    setZoom(1);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const save = async () => {
    if (!pendingFile) return;
    setSaving(true);
    try {
      const dataUrl = await processProfileImageFile(pendingFile, zoom);
      const res = await fetch("/api/dashboard/profile/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      setImage(dataUrl);
      setProfileImage(dataUrl);
      setPreview(null);
      setPendingFile(null);
      onUpdated?.(dataUrl);
      await refresh();
      toast.success(t("settings.photoUpdated"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/profile/image", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove");
      setImage(null);
      setProfileImage(null);
      setPreview(null);
      setPendingFile(null);
      onUpdated?.(null);
      await refresh();
      toast.success(t("settings.photoRemoved"));
    } catch {
      toast.error(t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <ProfileAvatar name={session?.user?.name} image={preview ?? image} size="xl" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary">{t("settings.profilePhoto")}</p>
          <p className="text-xs text-text-muted mt-1">{t("settings.profilePhotoDesc")}</p>
        </div>
      </div>

      {!preview ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
            dragOver ? "border-accent-brand bg-accent-brand/5" : "border-border hover:border-accent-brand/40"
          }`}
          onClick={() => fileRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
        >
          <Upload size={24} className="mx-auto text-text-muted mb-2" />
          <p className="text-sm text-text-secondary">{t("settings.dragDrop")}</p>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            <Button type="button" variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}>
              {t("settings.chooseGallery")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); cameraRef.current?.click(); }}>
              <Camera size={14} /> {t("settings.takePhoto")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-border p-4">
          <p className="text-sm font-medium text-text-primary">{t("settings.cropPhoto")}</p>
          <div className="relative mx-auto h-40 w-40 rounded-full overflow-hidden ring-2 ring-accent-brand/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt=""
              className="h-full w-full object-cover"
              style={{ transform: `scale(${zoom})` }}
            />
          </div>
          <label className="flex items-center gap-3 text-sm text-text-muted">
            <ZoomIn size={16} />
            <input
              type="range"
              min="1"
              max="2.5"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-accent-brand"
            />
          </label>
          <div className="flex gap-2">
            <Button onClick={save} isLoading={saving} className="flex-1">{t("common.save")}</Button>
            <Button variant="ghost" onClick={() => { setPreview(null); setPendingFile(null); }}>{t("common.cancel")}</Button>
          </div>
        </div>
      )}

      {image && !preview && (
        <Button variant="outline" size="sm" onClick={remove} isLoading={saving} className="text-accent-red border-accent-red/30">
          <Trash2 size={14} /> {t("common.remove")}
        </Button>
      )}

      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      <input ref={cameraRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
    </div>
  );
}
