import { publicConfig } from "@/lib/config";

export const PRODUCTS = publicConfig.products;

export const CONTENT_TYPES = publicConfig.contentTypes;

export const FILE_TYPES = ["image", "video", "pdf", "raw", "other"] as const;
export const ASSET_STATUSES = ["draft", "approved", "archived"] as const;

export const COLLECTIONS = publicConfig.collections;
