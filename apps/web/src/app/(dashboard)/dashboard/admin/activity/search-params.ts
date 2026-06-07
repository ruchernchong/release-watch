import { createSearchParamsCache, parseAsInteger } from "nuqs/server";

export const adminActivitySearchParams = {
  offset: parseAsInteger.withDefault(0),
};

export const adminActivitySearchParamsCache = createSearchParamsCache(
  adminActivitySearchParams,
);
