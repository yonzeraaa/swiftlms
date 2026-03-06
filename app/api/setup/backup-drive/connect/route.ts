import crypto from "crypto";
import { google } from "googleapis";
import { NextResponse } from "next/server";
import { getAuthenticatedSetupUser } from "@/lib/setup/server";
import { getBackupOAuthConnectConfig } from "@/lib/setup/service";

const BACKUP_DRIVE_STATE_COOKIE = "swiftlms_backup_drive_oauth_state";

export async function GET(request: Request) {
  try {
    const { user } = await getAuthenticatedSetupUser();
    const origin = new URL(request.url).origin;
    const config = await getBackupOAuthConnectConfig(user.id, origin);
    const state = crypto.randomUUID();

    const oauth2 = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );

    const authUrl = oauth2.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["https://www.googleapis.com/auth/drive"],
      include_granted_scopes: true,
      state,
    });

    const response = NextResponse.redirect(authUrl);
    response.cookies.set({
      name: BACKUP_DRIVE_STATE_COOKIE,
      value: state,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10,
    });

    return response;
  } catch (error: any) {
    const url = new URL("/setup", request.url);
    url.searchParams.set("backupDrive", "error");
    url.searchParams.set("message", error.message || "Falha ao iniciar conexão com Google Drive");
    return NextResponse.redirect(url);
  }
}
