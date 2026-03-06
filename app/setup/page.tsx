import { redirect } from "next/navigation";
import Breadcrumbs from "@/app/components/ui/Breadcrumbs";
import { getAuthenticatedSetupUser } from "@/lib/setup/server";
import SetupWizardClient from "./SetupWizardClient";

export default async function SetupPage() {
  try {
    const { profile } = await getAuthenticatedSetupUser();

    return (
      <div className="space-y-6">
        <Breadcrumbs className="mb-2" />
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gold">
            Setup da Instalacao
          </h1>
          <p className="text-gold-300 mt-1">
            Configure branding, integracoes e a validacao final da instancia.
          </p>
        </div>

        <SetupWizardClient
          currentUserEmail={profile.email}
        />
      </div>
    );
  } catch {
    redirect("/");
  }
}
