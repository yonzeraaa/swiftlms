import { NextRequest, NextResponse } from "next/server";
import { saveSetupStep } from "@/lib/setup/service";
import { getAuthenticatedSetupUser } from "@/lib/setup/server";

export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedSetupUser();
    const body = await request.json();
    const state = await saveSetupStep(body.step, body.payload, user.id);
    return NextResponse.json({ success: true, state });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Falha ao salvar etapa do setup" },
      { status: error.message === "Não autenticado" ? 401 : 400 }
    );
  }
}
