export default function Settings() {
  return (
    <div className="max-w-3xl space-y-8 animate-fade-in">
      {/* Store Info */}
      <Section title="Store Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Store Name" defaultValue="NEVERSORE" />
          <Field label="Store Email" defaultValue="hello@neversore.com" />
          <Field label="Phone" defaultValue="+91 98765 43210" />
          <Field label="Currency" defaultValue="INR (₹)" />
        </div>
      </Section>

      {/* Payment */}
      <Section title="Payment Settings">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Payment Gateway" defaultValue="Razorpay" />
          <Field label="UPI ID" defaultValue="neversore@upi" />
        </div>
      </Section>

      {/* Shipping */}
      <Section title="Shipping Settings">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Default Shipping" defaultValue="₹99" />
          <Field label="Free Shipping Above" defaultValue="₹1,999" />
        </div>
      </Section>

      {/* Admin Profile */}
      <Section title="Admin Profile">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Name" defaultValue="Admin" />
          <Field label="Email" defaultValue="admin@neversore.com" />
        </div>
      </Section>

      {/* Change Password */}
      <Section title="Change Password">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Current Password" type="password" />
          <Field label="New Password" type="password" />
        </div>
      </Section>

      <button className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 transition-colors">
        Save Changes
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="font-heading text-lg font-bold mb-4">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, defaultValue, type = "text" }: { label: string; defaultValue?: string; type?: string }) {
  return (
    <div>
      <label className="text-sm text-muted-foreground mb-1 block">{label}</label>
      <input
        type={type}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
  );
}
