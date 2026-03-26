/**
 * Tests for Gemini auto-tagging
 * @jest-environment node
 */
import { tagImageWithGemini } from "@/lib/gemini-tagger";

const originalFetch = global.fetch;

describe("tagImageWithGemini", () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-gemini-key";
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.GEMINI_API_KEY;
    jest.restoreAllMocks();
  });

  it("returns null when GEMINI_API_KEY is not set", async () => {
    delete process.env.GEMINI_API_KEY;

    const result = await tagImageWithGemini("https://example.com/image.jpg");

    expect(result).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("parses JSON wrapped in markdown fences from Gemini", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => new TextEncoder().encode("image-bytes").buffer,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: '```json\n{"tags":["hero","minimal"],"product":"Self Journal","description":"A clean product shot."}\n```',
                  },
                ],
              },
            },
          ],
        }),
      });

    const result = await tagImageWithGemini("https://example.com/image.jpg");

    expect(result).toEqual({
      tags: ["hero", "minimal"],
      product: "Self Journal",
      description: "A clean product shot.",
    });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
