import {
  createSearchParamsCache,
  parseAsInteger,
  parseAsString,
} from "nuqs/server";

export const adminUsersSearchParams = {
  search: parseAsString.withDefault(""),
  offset: parseAsInteger.withDefault(0),
};

export const adminUsersSearchParamsCache = createSearchParamsCache(
  adminUsersSearchParams,
);
