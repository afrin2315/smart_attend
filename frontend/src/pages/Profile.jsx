import { useAuth } from "../context/AuthContext";
import QRDisplay from "../components/QRDisplay";

const Profile = () => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const downloadQR = () => {
    const link = document.createElement("a");
    link.href = user.personal_qr_image;
    link.download = `${user.name.replace(/\s+/g, "-").toLowerCase()}-personal-qr.png`;
    link.click();
  };

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-3">
        <div className="eyebrow">Profile</div>
        <h1 className="section-title">Your permanent SmartAttend identity.</h1>
        <p className="section-copy">
          This personal QR is permanent to your account and pairs with the active session QR to protect attendance integrity.
        </p>
      </section>

      <div className="grid gap-8 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="card bg-gradient-to-br from-white to-slate-50 p-6">
          <div className="grid gap-5">
            <div>
              <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">Name</div>
              <div className="mt-2 text-xl font-bold text-slate-900">{user.name}</div>
            </div>
            <div>
              <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">Email</div>
              <div className="mt-2 text-lg text-slate-700">{user.email}</div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">Role</div>
                <div className="mt-2 text-lg capitalize text-slate-700">{user.role}</div>
              </div>
              <div>
                <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">Organization Type</div>
                <div className="mt-2 text-lg capitalize text-slate-700">{user.org_type}</div>
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">Personal QR Code</div>
              <div className="mt-2 break-all rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
                {user.personal_qr_code}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <QRDisplay
            title={`${user.name}'s Personal QR`}
            subtitle="Permanent identity QR"
            qrImage={user.personal_qr_image}
            footer="Download this code for onboarding cards or ID badges."
          />
          <button type="button" className="btn-secondary" onClick={downloadQR}>
            Download My QR
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
