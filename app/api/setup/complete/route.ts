import { NextResponse } from "next/server";
import { completeSetup } from "@/lib/setup/service";
import { getAuthenticatedSetupUser } from "@/lib/setup/server";

export async function POST() {
  try {
    const { user } = await getAuthenticatedSetupUser();
    const state = await completeSetup(user.id);
    return NextResponse.json({ success: true, state });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Falha ao concluir setup" },
      { status: error.message === "Não autenticado" ? 401 : 400 }
    );
  }
}
