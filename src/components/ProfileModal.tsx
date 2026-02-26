import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Camera, Loader2, Eye, EyeOff, UserCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

const inputCls =
  "w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed";

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
  const { profile, user, updateProfile, uploadAvatar } = useAuth();

  // Profile fields
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Admin";
  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Avatar must be under 5MB"); return; }
    setAvatarUploading(true);
    const { error } = await uploadAvatar(file);
    setAvatarUploading(false);
    if (error) toast.error("Upload failed: " + error);
    else toast.success("Avatar updated");
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    const { error } = await updateProfile({ full_name: fullName, phone });
    setSaving(false);
    if (error) toast.error("Failed to save: " + error);
    else toast.success("Profile updated successfully");
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) { toast.error("New password must be at least 8 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match"); return; }
    setSavingPwd(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email ?? "",
      password: currentPassword,
    });
    if (signInError) { toast.error("Current password is incorrect"); setSavingPwd(false); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPwd(false);
    if (error) toast.error("Failed to update password: " + error.message);
    else {
      toast.success("Password updated successfully");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-primary" />
            <DialogTitle className="font-heading text-lg">Admin Profile</DialogTitle>
          </div>
        </DialogHeader>

        {/* Avatar */}
        <div className="flex items-center gap-4 py-2">
          <div className="relative shrink-0">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.avatar_url ?? undefined} alt={displayName} />
              <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={avatarUploading}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {avatarUploading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Camera className="h-3.5 w-3.5" />}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div>
            <p className="text-sm font-semibold">{displayName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{profile?.email || user?.email}</p>
            <p className="text-xs text-muted-foreground/60 mt-1">JPG, PNG or WebP · max 5MB</p>
          </div>
        </div>

        {/* Profile fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Full Name</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Email</label>
            <input type="email" value={profile?.email || user?.email || ""} disabled className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Role</label>
            <input type="text" value={profile?.role ?? "admin"} disabled className={inputCls} />
          </div>
        </div>

        <button
          onClick={handleSaveProfile}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold uppercase text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 w-full justify-center"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Saving…" : "Save Profile"}
        </button>

        {/* Divider */}
        <div className="border-t border-border pt-4 mt-1">
          <p className="text-sm font-semibold mb-3">Change Password</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Current Password</label>
              <div className="relative">
                <input type={showCurrent ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Current password" className={inputCls + " pr-10"} />
                <button type="button" onClick={() => setShowCurrent((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">New Password</label>
              <div className="relative">
                <input type={showNew ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 8 characters" className={inputCls + " pr-10"} />
                <button type="button" onClick={() => setShowNew((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat new password" className={inputCls} />
            </div>
          </div>

          <button
            onClick={handleChangePassword}
            disabled={savingPwd || !currentPassword || !newPassword || !confirmPassword}
            className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-secondary px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-accent transition-colors disabled:opacity-50 w-full justify-center"
          >
            {savingPwd && <Loader2 className="h-4 w-4 animate-spin" />}
            {savingPwd ? "Updating…" : "Update Password"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
