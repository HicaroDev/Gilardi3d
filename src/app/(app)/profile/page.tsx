import { requireUser } from "@/lib/auth";
import { ProfileForms } from "@/components/app/profile-forms";

export const metadata = { title: "Perfil" };

export default async function ProfilePage() {
  const user = await requireUser();
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Perfil</h1>
      <p className="mt-1 text-sm text-muted">{user.email}</p>
      <ProfileForms name={user.name} />
    </div>
  );
}
