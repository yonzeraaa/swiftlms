import { NextResponse } from "next/server";
import { claimInitialInstaller, getSetupWizardState } from "@/lib/setup/service";
import { getAuthenticatedSetupUser } from "@/lib/setup/server";

export async function POST() {
  try {
    const { user } = await getAuthenticatedSetupUser();
    await claimInitialInstaller(user.id);
    const state = await getSetupWizardState();
    return NextResponse.json({ success: true, state });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Falha ao reservar o setup inicial" },
      { status: error.message === "Não autenticado" ? 401 : 409 }
    );
  }
}
