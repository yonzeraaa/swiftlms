import { NextResponse } from "next/server";
import { getSetupWizardState } from "@/lib/setup/service";
import { getAuthenticatedSetupUser } from "@/lib/setup/server";

export async function GET() {
  try {
    await getAuthenticatedSetupUser();
    const state = await getSetupWizardState();
    return NextResponse.json({ success: true, state });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Falha ao carregar o status do setup" },
      { status: error.message === "Não autenticado" ? 401 : 500 }
    );
  }
}
