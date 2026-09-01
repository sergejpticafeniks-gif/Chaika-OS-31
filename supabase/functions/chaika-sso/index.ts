/**
 * Чайка ОС — SSO / OAuth2.0 + OpenID Connect
 * Endpoints:
 *   GET  /status
 *   GET  /.well-known/openid-configuration
 *   GET  /jwks
 *   POST /register            (Supabase JWT required)
 *   GET  /clients             (Supabase JWT required)
 *   POST /authorize/approve   (Supabase JWT required — from consent page)
 *   POST /token               (client_secret auth)
 *   GET  /userinfo            (Bearer access_token)
 *   POST /introspect          (client_secret auth)
 *   POST /revoke              (client_secret auth)
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const ISSUER   = "https://edmxgfiyabbptsjeedmx.backend.onspace.ai/functions/v1/chaika-sso";
const AUTH_EP  = "https://chaika-os.onspace.build/oauth/authorize";
const TOKEN_EXP   = 3600;        // 1 h
const REFRESH_EXP = 30 * 24 * 3600; // 30 d

// ─── Utils ────────────────────────────────────────────────────
const b64url = (s: string) =>
  btoa(s).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

const b64decode = (s: string) =>
  atob(s.replace(/-/g, "+").replace(/_/g, "/"));

function randomHex(bytes = 32): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return Array.from(a, b => b.toString(16).padStart(2, "0")).join("");
}

async function signJwt(payload: Record<string, unknown>, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const pay    = b64url(JSON.stringify(payload));
  const data   = `${header}.${pay}`;
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return `${data}.${b64url(String.fromCharCode(...new Uint8Array(sig)))}`;
}

async function verifyJwt(token: string, secret: string): Promise<Record<string, unknown> | null> {
  try {
    const [h, p, s] = token.split(".");
    if (!h || !p || !s) return null;
    const enc  = new TextEncoder();
    const data = `${h}.${p}`;
    const key  = await crypto.subtle.importKey(
      "raw", enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
    );
    const sigBytes = Uint8Array.from(b64decode(s), c => c.charCodeAt(0));
    const ok = await crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(data));
    if (!ok) return null;
    const payload = JSON.parse(b64decode(p));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

async function verifyPKCE(verifier: string, challenge: string, method = "S256"): Promise<boolean> {
  if (method === "plain") return verifier === challenge;
  const enc  = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-256", enc.encode(verifier));
  return b64url(String.fromCharCode(...new Uint8Array(hash))) === challenge;
}

// ─── Main ─────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url  = new URL(req.url);
  let   path = url.pathname;
  const PFXS = ["/functions/v1/chaika-sso", "/chaika-sso"];
  for (const pfx of PFXS) if (path.startsWith(pfx)) { path = path.slice(pfx.length) || "/"; break; }

  const supaAdmin = createClient(
    Deno.env.get("SUPABASE_URL")            ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const JWT_SECRET = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "chaika-sso-2026").slice(0, 64);

  const json = (d: unknown, status = 200) =>
    new Response(JSON.stringify(d), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  const err = (msg: string, status = 400) => json({ error: msg, error_description: msg }, status);

  try {
    // ── Status ──────────────────────────────────────────────
    if (path === "/" || path === "/status") {
      return json({ status: "ok", service: "Чайка SSO", version: "1.0.0", issuer: ISSUER });
    }

    // ── OIDC Discovery ───────────────────────────────────────
    if (path === "/.well-known/openid-configuration") {
      return json({
        issuer:                               ISSUER,
        authorization_endpoint:               AUTH_EP,
        token_endpoint:                       `${ISSUER}/token`,
        userinfo_endpoint:                    `${ISSUER}/userinfo`,
        jwks_uri:                             `${ISSUER}/jwks`,
        introspection_endpoint:               `${ISSUER}/introspect`,
        revocation_endpoint:                  `${ISSUER}/revoke`,
        registration_endpoint:                `${ISSUER}/register`,
        scopes_supported:                     ["openid", "profile", "email", "offline_access"],
        response_types_supported:             ["code"],
        grant_types_supported:                ["authorization_code", "refresh_token"],
        token_endpoint_auth_methods_supported:["client_secret_post", "client_secret_basic"],
        code_challenge_methods_supported:     ["S256", "plain"],
        subject_types_supported:              ["public"],
        id_token_signing_alg_values_supported:["HS256"],
        claims_supported:                     ["sub","iss","aud","exp","iat","name","email","given_name","family_name","preferred_username","picture","display_id"],
        service_documentation:                "https://chaika-os.onspace.build/sso-guide",
      });
    }

    // ── JWKS ────────────────────────────────────────────────
    if (path === "/jwks") {
      return json({ keys: [{ kty: "oct", alg: "HS256", use: "sig" }] });
    }

    // ── Register OAuth Client ────────────────────────────────
    if (path === "/register" && req.method === "POST") {
      const authHdr = req.headers.get("Authorization");
      if (!authHdr?.startsWith("Bearer ")) return err("Unauthorized", 401);
      const { data: { user } } = await supaAdmin.auth.getUser(authHdr.slice(7));
      if (!user) return err("Unauthorized", 401);
      const { data: prof } = await supaAdmin.from("user_profiles").select("id").eq("id", user.id).single();
      if (!prof) return err("User profile not found", 401);

      const body = await req.json();
      const { name, description, redirect_uris, logo_url, scopes = ["openid","profile","email"] } = body;
      if (!name || !redirect_uris?.length) return err("name and redirect_uris required");

      const clientId     = `chaika_${randomHex(10)}`;
      const clientSecret = randomHex(32);

      const { error: dbErr } = await supaAdmin.from("oauth_clients").insert({
        client_id:     clientId,
        client_secret: clientSecret,
        name, description, redirect_uris, logo_url, scopes,
        created_by:    prof.id,
      });
      if (dbErr) return err(dbErr.message, 500);
      return json({ client_id: clientId, client_secret: clientSecret, name, redirect_uris, scopes, issuer: ISSUER }, 201);
    }

    // ── List My Clients ──────────────────────────────────────
    if (path === "/clients" && req.method === "GET") {
      const authHdr = req.headers.get("Authorization");
      if (!authHdr?.startsWith("Bearer ")) return err("Unauthorized", 401);
      const { data: { user } } = await supaAdmin.auth.getUser(authHdr.slice(7));
      if (!user) return err("Unauthorized", 401);
      const { data: clients } = await supaAdmin.from("oauth_clients").select("id,client_id,name,description,logo_url,redirect_uris,scopes,is_active,created_at").eq("created_by", user.id);
      return json({ clients: clients ?? [] });
    }

    // ── Approve Consent (React consent page → edge function) ─
    if (path === "/authorize/approve" && req.method === "POST") {
      const authHdr = req.headers.get("Authorization");
      if (!authHdr?.startsWith("Bearer ")) return err("Unauthorized", 401);
      const { data: { user } } = await supaAdmin.auth.getUser(authHdr.slice(7));
      if (!user) return err("Unauthorized", 401);

      const body = await req.json();
      const { client_id, redirect_uri, scopes = [], state, code_challenge, code_challenge_method } = body;
      if (!client_id || !redirect_uri) return err("client_id and redirect_uri required");

      const { data: client } = await supaAdmin.from("oauth_clients").select().eq("client_id", client_id).eq("is_active", true).single();
      if (!client) return err("Unknown client_id");
      if (!client.redirect_uris.includes(redirect_uri)) return err("redirect_uri not registered");

      const { data: profile } = await supaAdmin.from("user_profiles").select("id").eq("id", user.id).single();
      if (!profile) return err("User profile not found");

      const code      = randomHex(24);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await supaAdmin.from("oauth_codes").insert({
        code, client_id, user_id: profile.id, redirect_uri,
        scopes, code_challenge: code_challenge ?? null,
        code_challenge_method: code_challenge_method ?? null,
        expires_at: expiresAt,
      });

      return json({ code, state, redirect_uri });
    }

    // ── Token Endpoint ───────────────────────────────────────
    if (path === "/token" && req.method === "POST") {
      const ct   = req.headers.get("Content-Type") ?? "";
      let body: Record<string, string> = {};
      if (ct.includes("application/x-www-form-urlencoded")) {
        new URLSearchParams(await req.text()).forEach((v, k) => { body[k] = v; });
      } else {
        body = await req.json();
      }

      // Resolve client credentials (body or Basic auth)
      let clientId     = body.client_id     ?? "";
      let clientSecret = body.client_secret ?? "";
      const basic = req.headers.get("Authorization");
      if (basic?.startsWith("Basic ")) {
        const decoded = b64decode(basic.slice(6));
        const [a, b2]  = decoded.split(":");
        clientId     = a ?? clientId;
        clientSecret = b2 ?? clientSecret;
      }

      const { data: client } = await supaAdmin.from("oauth_clients").select().eq("client_id", clientId).single();
      if (!client || client.client_secret !== clientSecret) return err("Invalid client credentials", 401);

      // ── Authorization Code ───────────────────────────────
      if (body.grant_type === "authorization_code") {
        const { code, redirect_uri, code_verifier } = body;
        if (!code) return err("code required");

        const { data: authCode } = await supaAdmin.from("oauth_codes")
          .select().eq("code", code).eq("client_id", clientId).eq("used", false).single();
        if (!authCode) return err("Invalid or expired authorization code");
        if (new Date(authCode.expires_at) < new Date()) return err("Authorization code expired");
        if (authCode.redirect_uri !== redirect_uri) return err("redirect_uri mismatch");

        if (authCode.code_challenge) {
          if (!code_verifier) return err("code_verifier required");
          const ok = await verifyPKCE(code_verifier, authCode.code_challenge, authCode.code_challenge_method ?? "S256");
          if (!ok) return err("Invalid code_verifier");
        }

        await supaAdmin.from("oauth_codes").update({ used: true }).eq("code", code);

        const { data: profile } = await supaAdmin.from("user_profiles").select().eq("id", authCode.user_id).single();
        const now   = Math.floor(Date.now() / 1000);
        const scope = authCode.scopes.join(" ");

        const accessToken = await signJwt({
          iss: ISSUER, sub: profile.id, aud: clientId,
          iat: now, exp: now + TOKEN_EXP,
          scope, token_type: "access",
        }, JWT_SECRET);

        const idToken = await signJwt({
          iss: ISSUER, sub: profile.id, aud: clientId,
          iat: now, exp: now + TOKEN_EXP,
          name:               [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.username,
          email:              profile.email,
          email_verified:     true,
          given_name:         profile.first_name  ?? "",
          family_name:        profile.last_name   ?? "",
          preferred_username: profile.username    ?? profile.email,
          display_id:         profile.display_id  ?? "",
        }, JWT_SECRET);

        const refreshToken = randomHex(32);

        await supaAdmin.from("oauth_tokens").insert({
          access_token:       accessToken,
          refresh_token:      refreshToken,
          client_id:          clientId,
          user_id:            profile.id,
          scopes:             authCode.scopes,
          expires_at:         new Date(Date.now() + TOKEN_EXP   * 1000).toISOString(),
          refresh_expires_at: new Date(Date.now() + REFRESH_EXP * 1000).toISOString(),
        });

        return json({ access_token: accessToken, id_token: idToken, refresh_token: refreshToken, token_type: "Bearer", expires_in: TOKEN_EXP, scope });
      }

      // ── Refresh Token ───────────────────────────────────
      if (body.grant_type === "refresh_token") {
        const { refresh_token } = body;
        if (!refresh_token) return err("refresh_token required");

        const { data: tok } = await supaAdmin.from("oauth_tokens")
          .select().eq("refresh_token", refresh_token).eq("client_id", clientId).eq("revoked", false).single();
        if (!tok) return err("Invalid refresh token");
        if (new Date(tok.refresh_expires_at) < new Date()) return err("Refresh token expired");

        const { data: profile } = await supaAdmin.from("user_profiles").select().eq("id", tok.user_id).single();
        const now    = Math.floor(Date.now() / 1000);
        const scope  = tok.scopes.join(" ");

        const newAccess  = await signJwt({ iss: ISSUER, sub: profile.id, aud: clientId, iat: now, exp: now + TOKEN_EXP, scope, token_type: "access" }, JWT_SECRET);
        const newRefresh = randomHex(32);

        await supaAdmin.from("oauth_tokens").update({ revoked: true }).eq("refresh_token", refresh_token);
        await supaAdmin.from("oauth_tokens").insert({
          access_token: newAccess, refresh_token: newRefresh, client_id: clientId, user_id: profile.id,
          scopes: tok.scopes,
          expires_at:         new Date(Date.now() + TOKEN_EXP   * 1000).toISOString(),
          refresh_expires_at: new Date(Date.now() + REFRESH_EXP * 1000).toISOString(),
        });

        return json({ access_token: newAccess, refresh_token: newRefresh, token_type: "Bearer", expires_in: TOKEN_EXP, scope });
      }

      return err("unsupported_grant_type");
    }

    // ── UserInfo ─────────────────────────────────────────────
    if (path === "/userinfo") {
      const authHdr = req.headers.get("Authorization");
      if (!authHdr?.startsWith("Bearer ")) return err("Unauthorized", 401);
      const token   = authHdr.slice(7);
      const payload = await verifyJwt(token, JWT_SECRET);
      if (!payload) return err("Invalid or expired token", 401);

      const { data: tok } = await supaAdmin.from("oauth_tokens").select("revoked").eq("access_token", token).single();
      if (!tok || tok.revoked) return err("Token revoked", 401);

      const { data: profile } = await supaAdmin.from("user_profiles").select().eq("id", payload.sub as string).single();
      if (!profile) return err("User not found", 404);

      const scopes = ((payload.scope as string) ?? "").split(" ");
      const claims: Record<string, unknown> = { sub: profile.id };
      if (scopes.includes("profile")) {
        claims.name               = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.username;
        claims.given_name         = profile.first_name  ?? "";
        claims.family_name        = profile.last_name   ?? "";
        claims.preferred_username = profile.username    ?? profile.email;
        claims.display_id         = profile.display_id  ?? "";
        claims.picture            = null;
      }
      if (scopes.includes("email")) {
        claims.email          = profile.email;
        claims.email_verified = true;
      }
      return json(claims);
    }

    // ── Introspect ───────────────────────────────────────────
    if (path === "/introspect" && req.method === "POST") {
      const params: Record<string, string> = {};
      new URLSearchParams(await req.text()).forEach((v, k) => { params[k] = v; });
      const { token, client_id: cId, client_secret: cSec } = params;

      const { data: cl } = await supaAdmin.from("oauth_clients").select().eq("client_id", cId).single();
      if (!cl || cl.client_secret !== cSec) return json({ active: false });

      const payload = await verifyJwt(token ?? "", JWT_SECRET);
      if (!payload) return json({ active: false });

      const { data: tok } = await supaAdmin.from("oauth_tokens").select().eq("access_token", token).eq("revoked", false).single();
      if (!tok) return json({ active: false });

      const { data: pr } = await supaAdmin.from("user_profiles").select("username,email").eq("id", payload.sub as string).single();
      return json({ active: true, client_id: payload.aud, username: pr?.username, email: pr?.email, sub: payload.sub, scope: payload.scope, iat: payload.iat, exp: payload.exp, iss: payload.iss, token_type: "Bearer" });
    }

    // ── Revoke ───────────────────────────────────────────────
    if (path === "/revoke" && req.method === "POST") {
      const params: Record<string, string> = {};
      new URLSearchParams(await req.text()).forEach((v, k) => { params[k] = v; });
      const { token } = params;
      if (token) {
        await supaAdmin.from("oauth_tokens").update({ revoked: true }).or(`access_token.eq.${token},refresh_token.eq.${token}`);
      }
      return new Response("", { status: 200, headers: corsHeaders });
    }

    return err("Not found", 404);
  } catch (e: any) {
    console.error("[chaika-sso]", e.message);
    return err(`Internal server error: ${e.message}`, 500);
  }
});
