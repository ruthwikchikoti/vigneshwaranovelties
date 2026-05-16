import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted so mock fns are available when the factory runs (vi.mock is hoisted)
const { mockUnstableCache, mockRevalidateTag } = vi.hoisted(() => ({
  mockUnstableCache: vi.fn(),
  mockRevalidateTag: vi.fn(),
}));

vi.mock("next/cache", () => ({
  unstable_cache: mockUnstableCache,
  revalidateTag: mockRevalidateTag,
}));

import { cachedQuery, revalidateCache, CACHE_TAGS } from "../cache";

describe("CACHE_TAGS", () => {
  it("should have all unique non-empty string values", () => {
    const values = Object.values(CACHE_TAGS);
    expect(values.length).toBeGreaterThan(0);
    for (const v of values) {
      expect(typeof v).toBe("string");
      expect(v.length).toBeGreaterThan(0);
    }
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});

describe("cachedQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call unstable_cache with correct keyParts, tags, and revalidate", async () => {
    const innerFn = async () => [{ id: 1 }];
    const cachedFn = vi.fn().mockResolvedValue([{ id: 1 }]);
    mockUnstableCache.mockReturnValue(cachedFn);

    await cachedQuery(innerFn, ["getCategories"], [CACHE_TAGS.categories]);

    expect(mockUnstableCache).toHaveBeenCalledOnce();
    expect(mockUnstableCache).toHaveBeenCalledWith(
      innerFn,
      ["getCategories"],
      { revalidate: 60, tags: ["categories"] },
    );
    expect(cachedFn).toHaveBeenCalledOnce();
  });

  it("should pass custom revalidate value", async () => {
    const innerFn = async () => "data";
    const cachedFn = vi.fn().mockResolvedValue("data");
    mockUnstableCache.mockReturnValue(cachedFn);

    await cachedQuery(innerFn, ["key"], [CACHE_TAGS.products], 120);

    expect(mockUnstableCache).toHaveBeenCalledWith(
      innerFn,
      ["key"],
      { revalidate: 120, tags: ["products"] },
    );
  });

  it("should return the inner function's result", async () => {
    const expected = { products: [{ id: 1 }], total: 1 };
    const innerFn = async () => expected;
    const cachedFn = vi.fn().mockResolvedValue(expected);
    mockUnstableCache.mockReturnValue(cachedFn);

    const result = await cachedQuery(innerFn, ["test"], [CACHE_TAGS.products]);

    expect(result).toEqual(expected);
  });
});

describe("revalidateCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call revalidateTag for each provided tag", () => {
    revalidateCache(CACHE_TAGS.products, CACHE_TAGS.categories);

    expect(mockRevalidateTag).toHaveBeenCalledTimes(2);
    expect(mockRevalidateTag).toHaveBeenCalledWith("products");
    expect(mockRevalidateTag).toHaveBeenCalledWith("categories");
  });

  it("should call revalidateTag once for a single tag", () => {
    revalidateCache(CACHE_TAGS.settings);

    expect(mockRevalidateTag).toHaveBeenCalledOnce();
    expect(mockRevalidateTag).toHaveBeenCalledWith("settings");
  });

  it("should handle no tags gracefully", () => {
    revalidateCache();

    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });
});
