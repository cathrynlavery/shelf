#!/usr/bin/env ts-node

import { COLLECTIONS } from "../src/lib/constants";
import { parseImportArgs, runImport, BASE_PREFIX } from "../src/lib/import-from-r2";

async function main() {
  const options = parseImportArgs(process.argv.slice(2));

  if (
    options.collection &&
    !COLLECTIONS.includes(options.collection as (typeof COLLECTIONS)[number])
  ) {
    throw new Error(
      `Unknown collection "${options.collection}". Expected one of: ${COLLECTIONS.join(", ")}`
    );
  }

  const summary = await runImport({
    ...options,
    prefix: BASE_PREFIX,
  });

  console.log(
    JSON.stringify(
      {
        prefix: options.collection ? `${BASE_PREFIX}${options.collection}/` : BASE_PREFIX,
        collection: options.collection ?? null,
        limit: options.limit ?? null,
        ...summary,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
