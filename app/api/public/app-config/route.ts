import { NextResponse } from "next/server";
import { getInstallationStatus, getPublicSettings } from "@/lib/setup/service";

export async function GET() {
  try {
    const [installation, settings] = await Promise.all([
      getInstallationStatus(),
      getPublicSettings(),
    ]);

    return NextResponse.json(
      {
        success: true,
        installation,
        settings,
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Falha ao carregar configuração pública" },
      { status: 500 }
    );
  }
}
