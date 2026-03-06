import { NextRequest, NextResponse } from "next/server";
import { validateLatestBackup } from "@/lib/backup/restore";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const secret = process.env.BACKUP_CRON_SECRET || process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-backup-cron-secret");

  if (!secret || (authorization !== `Bearer ${secret}` && headerSecret !== secret)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 401 });
  }

  try {
    const result = await validateLatestBackup();
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Falha ao validar o último backup" },
      { status: 500 }
    );
  }
}
