import { google } from "googleapis";
import { NextResponse } from "next/server";
import { getAuthenticatedSetupUser } from "@/lib/setup/server";
import { getBackupOAuthConnectConfig, saveBackupRefreshToken } from "@/lib/setup/service";

const BACKUP_DRIVE_STATE_COOKIE = "swiftlms_backup_drive_oauth_state";

export async function GET(request: Request) {
  const url = new URL(request.url);

  try {
    const { user } = await getAuthenticatedSetupUser();
    const state = url.searchParams.get("state");
    const code = url.searchParams.get("code");
    const cookieState = request.headers
      .get("cookie")
      ?.split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith(`${BACKUP_DRIVE_STATE_COOKIE}=`))
      ?.split("=")[1];

    if (!state || !cookieState || state !== cookieState) {
      throw new Error("Estado inválido da autenticação do Google Drive.");
    }

    if (!code) {
      throw new Error("Código de autorização do Google Drive não recebido.");
    }

    const origin = url.origin;
    const config = await getBackupOAuthConnectConfig(user.id, origin);
    const oauth2 = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );

    const { tokens } = await oauth2.getToken(code);
    if (!tokens.refresh_token) {
      throw new Error("Google não retornou refresh token. Tente reconectar com consentimento.");
    }

    await saveBackupRefreshToken(user.id, tokens.refresh_token);

    const redirectUrl = new URL("/setup", request.url);
    redirectUrl.searchParams.set("backupDrive", "connected");
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete(BACKUP_DRIVE_STATE_COOKIE);
    return response;
  } catch (error: any) {
    const redirectUrl = new URL("/setup", request.url);
    redirectUrl.searchParams.set("backupDrive", "error");
    redirectUrl.searchParams.set("message", error.message || "Falha ao concluir conexão com Google Drive");
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete(BACKUP_DRIVE_STATE_COOKIE);
    return response;
  }
}
