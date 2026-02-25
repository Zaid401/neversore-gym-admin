import { useState } from "react";
import ProfileModal from "@/components/ProfileModal";

//  Reusable UI helpers 
function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-4">
        <h3 className="font-heading text-lg font-bold">{title}</h3>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm text-muted-foreground mb-1 block">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed";

//  Main Settings Page 
export default function Settings() {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className="max-w-3xl space-y-8 animate-fade-in">
      {/* Store Information */}
      <Section title="Store Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Store Name">
            <input type="text" defaultValue="NEVERSORE" className={inputCls} />
          </Field>
          <Field label="Store Email">
            <input type="email" defaultValue="hello@neversore.com" className={inputCls} />
          </Field>
          <Field label="Phone">
            <input type="tel" defaultValue="+91 98765 43210" className={inputCls} />
          </Field>
          <Field label="Currency">
            <input type="text" defaultValue="INR (₹)" className={inputCls} />
          </Field>
        </div>
      </Section>

      {/* Payment Settings */}
      <Section title="Payment Settings">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Payment Gateway">
            <input type="text" defaultValue="Razorpay" className={inputCls} />
          </Field>
          <Field label="UPI ID">
            <input type="text" defaultValue="neversore@upi" className={inputCls} />
          </Field>
        </div>
      </Section>

      {/* Shipping Settings */}
      <Section title="Shipping Settings">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Default Shipping">
            <input type="text" defaultValue="₹99" className={inputCls} />
          </Field>
          <Field label="Free Shipping Above">
            <input type="text" defaultValue="₹1,999" className={inputCls} />
          </Field>
        </div>
      </Section>

      {/* Profile Modal */}
      <ProfileModal open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  );
}
