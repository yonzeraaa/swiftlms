import { NextResponse } from "next/server";
import { validateCurrentSetup } from "@/lib/setup/service";
import { getAuthenticatedSetupUser } from "@/lib/setup/server";

export async function GET() {
  try {
    await getAuthenticatedSetupUser();
    const validation = await validateCurrentSetup();
    return NextResponse.json({ success: true, validation });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Falha ao validar o setup" },
      { status: error.message === "Não autenticado" ? 401 : 500 }
    );
  }
}
