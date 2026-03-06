import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runBackup } from "@/lib/backup/backup";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 401 });
  }

  try {
    const result = await runBackup();
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Falha ao executar rotina de backup" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdminRequest()) && !isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  try {
    const result = await runBackup();
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Falha ao executar backup" },
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

function isAuthorizedCronRequest(request: NextRequest) {
  const secret = process.env.BACKUP_CRON_SECRET || process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }

  const authorization = request.headers.get("authorization");
  if (authorization === `Bearer ${secret}`) {
    return true;
  }

  const headerSecret = request.headers.get("x-backup-cron-secret");
  return headerSecret === secret;
}
