/**
 * Tests for middleware auth behavior
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

function makeRequest(path: string, headers?: HeadersInit) {
  return new NextRequest(`http://localhost${path}`, {
    headers,
  });
}

function basicAuth(username: string, password: string) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

beforeEach(() => {
  process.env.API_KEY = "test-api-key";
  process.env.UI_PASSWORD = "test-ui-password";
});

describe("middleware", () => {
  it("requires Basic Auth for UI routes", () => {
    const response = middleware(makeRequest("/collections"));

    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe(
      'Basic realm="Shelf"'
    );
  });

  it("allows UI routes with valid Basic Auth", () => {
    const response = middleware(
      makeRequest("/", {
        authorization: basicAuth("admin", "test-ui-password"),
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("allows the public health check without auth", () => {
    const response = middleware(makeRequest("/api/health"));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("allows API routes with a valid API key", () => {
    const response = middleware(
      makeRequest("/api/assets/search", {
        "x-api-key": "test-api-key",
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("allows API routes with valid Basic Auth fallback", () => {
    const response = middleware(
      makeRequest("/api/assets/search", {
        authorization: basicAuth("admin", "test-ui-password"),
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("rejects API routes without valid credentials", () => {
    const response = middleware(makeRequest("/api/assets/search"));

    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe(
      'Basic realm="Shelf"'
    );
  });
});
