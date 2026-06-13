/**
 * Unit tests for the searchProducts function in lib/data.ts.
 *
 * These tests mock the Supabase client to verify:
 *  - empty/whitespace queries return [] immediately
 *  - the RPC path is used and results are re-hydrated in relevance order
 *  - the ILIKE fallback activates when the RPC is unavailable
 *  - the ILIKE fallback activates when the RPC returns zero rows
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────

// We need to mock "server-only" since it throws outside a server component.
vi.mock("server-only", () => ({}));

// Supabase env vars must look "configured" for the safe() wrapper to proceed.
vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");

let rpcMock: Mock;
let fromMock: Mock;

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    rpc: (...args: unknown[]) => rpcMock(...args),
    from: (...args: unknown[]) => fromMock(...args),
  })),
}));

// ── Import after mocks ──────────────────────────────────────────────

// Dynamic import is necessary so vi.mock() calls above are registered first.
const { searchProducts } = await import("@/lib/data");

// ── Tests ───────────────────────────────────────────────────────────

describe("searchProducts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rpcMock = vi.fn();
    fromMock = vi.fn();
  });

  it("returns [] for empty string", async () => {
    const result = await searchProducts("");
    expect(result).toEqual([]);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("returns [] for whitespace-only query", async () => {
    const result = await searchProducts("   ");
    expect(result).toEqual([]);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("calls the search_products RPC and re-hydrates in relevance order", async () => {
    // RPC returns flat rows with IDs in relevance order
    rpcMock.mockResolvedValue({
      data: [{ id: "aaa" }, { id: "bbb" }, { id: "ccc" }],
      error: null,
    });

    // The hydration query returns rows in arbitrary DB order
    const hydratedProducts = [
      { id: "ccc", title_en: "C", images: [], category: null },
      { id: "aaa", title_en: "A", images: [], category: null },
      { id: "bbb", title_en: "B", images: [], category: null },
    ];

    const limitMock = vi.fn().mockResolvedValue({ data: hydratedProducts, error: null });
    const eqMock = vi.fn().mockReturnValue({ limit: limitMock });
    const inMock = vi.fn().mockReturnValue({ eq: eqMock });

    fromMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: inMock,
      }),
    });

    const result = await searchProducts("silver");

    // Verify RPC was called with correct args
    expect(rpcMock).toHaveBeenCalledWith("search_products", {
      query: "silver",
      result_limit: 60,
    });

    // Verify hydration query includes is_active filter and limit
    expect(eqMock).toHaveBeenCalledWith("is_active", true);
    expect(limitMock).toHaveBeenCalledWith(3);

    // Results should be in relevance order (aaa, bbb, ccc) not DB order
    expect(result.map((p: { id: string }) => p.id)).toEqual(["aaa", "bbb", "ccc"]);
  });

  it("respects custom limit option", async () => {
    rpcMock.mockResolvedValue({
      data: [{ id: "aaa" }],
      error: null,
    });

    fromMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [{ id: "aaa", title_en: "A", images: [], category: null }],
              error: null,
            }),
          }),
        }),
      }),
    });

    await searchProducts("gold", { limit: 10 });

    expect(rpcMock).toHaveBeenCalledWith("search_products", {
      query: "gold",
      result_limit: 10,
    });
  });

  it("falls back to ILIKE when RPC returns an error", async () => {
    // RPC fails (migration not applied yet)
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: "function search_products does not exist", code: "42883" },
    });

    // ILIKE fallback chain
    const fallbackProducts = [
      { id: "xxx", title_en: "Silver Ring", images: [], category: null },
    ];

    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: fallbackProducts, error: null }),
    };
    fromMock.mockReturnValue(mockChain);

    const result = await searchProducts("silver");

    // Should have used the from().select()... chain
    expect(fromMock).toHaveBeenCalledWith("products");
    expect(mockChain.eq).toHaveBeenCalledWith("is_active", true);
    expect(mockChain.or).toHaveBeenCalled();
    expect(result).toEqual(fallbackProducts);
  });

  it("returns [] when RPC succeeds with zero results (no ILIKE fallback)", async () => {
    // RPC returns empty array — this is a valid "no matches" answer.
    rpcMock.mockResolvedValue({
      data: [],
      error: null,
    });

    const result = await searchProducts("xyznonexistent");

    // Should NOT fall back to ILIKE — empty RPC result is authoritative.
    expect(fromMock).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});
