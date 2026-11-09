import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy, buildSecurityHeaders } from "./headers";

const prod = buildSecurityHeaders({ production: true });
const dev = buildSecurityHeaders({ production: false });

function header(list: { key: string; value: string }[], key: string) {
  return list.find((entry) => entry.key === key)?.value;
}

describe("security headers", () => {
  it("sets the required baseline headers", () => {
    expect(header(prod, "Content-Security-Policy")).toBeTruthy();
    expect(header(prod, "X-Content-Type-Options")).toBe("nosniff");
    expect(header(prod, "Referrer-Policy")).toBe("no-referrer");
    expect(header(prod, "X-Frame-Options")).toBe("DENY");
    expect(header(prod, "Permissions-Policy")).toContain("camera=()");
    expect(header(prod, "Permissions-Policy")).toContain("microphone=()");
    expect(header(prod, "Permissions-Policy")).toContain("geolocation=()");
  });

  it("blocks framing through CSP, not only the legacy header", () => {
    expect(header(prod, "Content-Security-Policy")).toContain("frame-ancestors 'none'");
  });

  it("only sends HSTS in production", () => {
    expect(header(prod, "Strict-Transport-Security")).toContain("max-age=");
    expect(header(prod, "Strict-Transport-Security")).toContain("includeSubDomains");
    expect(header(dev, "Strict-Transport-Security")).toBeUndefined();
  });

  it("never allows eval in the production policy", () => {
    expect(header(prod, "Content-Security-Policy")).not.toContain("unsafe-eval");
    // Development needs it for React Refresh, production must not have it.
    expect(header(dev, "Content-Security-Policy")).toContain("unsafe-eval");
  });

  it("locks down the directives an apology letter never needs", () => {
    const csp = header(prod, "Content-Security-Policy") ?? "";
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("allows the resources the app actually uses", () => {
    const csp = header(prod, "Content-Security-Policy") ?? "";
    // Self-hosted fonts (next/font), same-origin media and uploads.
    expect(csp).toContain("font-src 'self'");
    expect(csp).toContain("img-src 'self' data: blob:");
    expect(csp).toContain("media-src 'self' blob:");
    expect(csp).toContain("connect-src 'self'");
    // Inline scripts and styles are unavoidable with Next's bootstrap payload
    // and the theme system's inline custom properties.
    expect(csp).toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
  });

  it("does not open any third-party origin", () => {
    const csp = header(prod, "Content-Security-Policy") ?? "";
    const external = csp.match(/https?:\/\/[^\s;]+/g) ?? [];
    expect(external).toEqual([]);
    expect(csp).not.toContain("*");
  });

  it("is a single well-formed header value", () => {
    const csp = buildContentSecurityPolicy({ production: true });
    expect(csp).not.toContain("\n");
    expect(csp.split(";").every((part) => part.trim().length > 0)).toBe(true);
  });

  it("does not duplicate a directive", () => {
    const directives = buildContentSecurityPolicy({ production: true })
      .split(";")
      .map((part) => part.trim().split(" ")[0]);
    expect(new Set(directives).size).toBe(directives.length);
  });
});
