/**
 * Tests for API key and Basic Auth validation
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { validateApiKey, validateBasicAuth, parseBasicAuth } from "@/lib/auth";

beforeEach(() => {
  process.env.API_KEY = "secret-key-abc";
  process.env.UI_PASSWORD = "team-password-xyz";
});

describe("validateApiKey", () => {
  it("returns false when x-api-key header is missing", () => {
    const req = new NextRequest("http://localhost/api/assets/search", {
      method: "POST",
    });
    expect(validateApiKey(req)).toBe(false);
  });

  it("returns false when x-api-key is wrong", () => {
    const req = new NextRequest("http://localhost/api/assets/search", {
      method: "POST",
      headers: { "x-api-key": "wrong-key" },
    });
    expect(validateApiKey(req)).toBe(false);
  });

  it("returns true when x-api-key is correct", () => {
    const req = new NextRequest("http://localhost/api/assets/search", {
      method: "POST",
      headers: { "x-api-key": "secret-key-abc" },
    });
    expect(validateApiKey(req)).toBe(true);
  });

  it("returns false when API_KEY env var is not set", () => {
    delete process.env.API_KEY;
    const req = new NextRequest("http://localhost/api/assets/search", {
      method: "POST",
      headers: { "x-api-key": "any-key" },
    });
    expect(validateApiKey(req)).toBe(false);
  });
});

describe("parseBasicAuth", () => {
  it("returns null for missing header", () => {
    expect(parseBasicAuth(null)).toBeNull();
  });

  it("returns null for non-Basic auth", () => {
    expect(parseBasicAuth("Bearer token")).toBeNull();
  });

  it("parses valid Basic auth header", () => {
    // username:password → base64
    const encoded = Buffer.from("admin:mypassword").toString("base64");
    const result = parseBasicAuth(`Basic ${encoded}`);
    expect(result).toEqual({ username: "admin", password: "mypassword" });
  });

  it("handles passwords with colons", () => {
    const encoded = Buffer.from("admin:pass:word:with:colons").toString("base64");
    const result = parseBasicAuth(`Basic ${encoded}`);
    expect(result).toEqual({ username: "admin", password: "pass:word:with:colons" });
  });
});

describe("validateBasicAuth", () => {
  it("returns false for missing Authorization header", () => {
    const req = new NextRequest("http://localhost/", { method: "GET" });
    expect(validateBasicAuth(req)).toBe(false);
  });

  it("returns false for wrong username", () => {
    const encoded = Buffer.from("wronguser:team-password-xyz").toString("base64");
    const req = new NextRequest("http://localhost/", {
      method: "GET",
      headers: { authorization: `Basic ${encoded}` },
    });
    expect(validateBasicAuth(req)).toBe(false);
  });

  it("returns false for wrong password", () => {
    const encoded = Buffer.from("admin:wrongpassword").toString("base64");
    const req = new NextRequest("http://localhost/", {
      method: "GET",
      headers: { authorization: `Basic ${encoded}` },
    });
    expect(validateBasicAuth(req)).toBe(false);
  });

  it("returns true for correct credentials", () => {
    const encoded = Buffer.from("admin:team-password-xyz").toString("base64");
    const req = new NextRequest("http://localhost/", {
      method: "GET",
      headers: { authorization: `Basic ${encoded}` },
    });
    expect(validateBasicAuth(req)).toBe(true);
  });
});
