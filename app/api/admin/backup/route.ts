import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runBackup } from "@/lib/backup/backup";

// Allow up to 5 minutes for large storage backups
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  // Auth: admin only
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json(
      { error: "Acesso negado. Apenas administradores." },
      { status: 403 }
    );
  }

  try {
    const result = await runBackup();
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("Backup failed:", error);
    return NextResponse.json(
      { error: error.message || "Falha ao executar backup" },
      { status: 500 }
    );
  }
}
