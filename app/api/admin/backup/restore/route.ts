import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listAvailableBackups, restoreBackup } from "@/lib/backup/restore";

export const maxDuration = 300;

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  try {
    const backups = await listAvailableBackups();
    return NextResponse.json({ success: true, backups });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Falha ao listar backups" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const result = await restoreBackup({
      backupId: body.backupId || undefined,
      apply: body.apply === true,
      restoreDatabase: body.restoreDatabase !== false,
      restoreStorage: body.restoreStorage !== false,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Falha ao restaurar backup" },
      { status: 500 }
    );
  }
}

async function isAdminRequest() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin";
}
