/**
 * Sprint 35C-1 — Product Master CLI.
 * Default: validate / dry-run. Zero database writes.
 * Execute requires --execute AND PRODUCT_MASTER_IMPORT_CONFIRM.
 * Prisma is loaded only after guards + commercial preflight pass.
 * Not wired to postinstall, build, migrate, or prisma seed.
 *
 *   npm run product-master:validate
 *   npm run product-master:import
 *   npm run product-master:import -- --dry-run
 *   npm run product-master:import -- --execute   (owner opt-in only)
 */

import { fromThailandProductMaster } from "@/lib/catalog/product-master-production-import/contract";
import {
  assertWriteAllowed,
  buildProductMasterPlan,
  dryRunProductMasterImport,
  executeProductMasterImport,
  formatProductMasterReport,
  parseProductMasterCliMode,
} from "@/lib/catalog/product-master-production-import/core";

async function main(): Promise<void> {
  const mode = parseProductMasterCliMode(process.argv.slice(2));
  const rows = fromThailandProductMaster();

  if (mode === "validate" || mode === "dry-run") {
    const result = dryRunProductMasterImport(rows);
    console.log(formatProductMasterReport(result));
    if (!result.plan.validation.ok || !result.plan.validation.commerciallyComplete) {
      process.exitCode = 1;
    }
    return;
  }

  try {
    assertWriteAllowed({
      execute: true,
      confirm: process.env.PRODUCT_MASTER_IMPORT_CONFIRM,
      lifecycleEvent: process.env.npm_lifecycle_event,
      vercel: process.env.VERCEL,
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  const preflight = buildProductMasterPlan(rows);
  if (!preflight.validation.ok || !preflight.validation.commerciallyComplete) {
    console.log(formatProductMasterReport(dryRunProductMasterImport(rows)));
    console.error(
      "Product Master execute refused: commercial preflight is incomplete. Prisma was not opened.",
    );
    process.exitCode = 1;
    return;
  }

  const { createPrismaCatalogWriter } = await import(
    "@/lib/catalog/product-master-production-import/prisma-writer"
  );
  const writer = createPrismaCatalogWriter();
  try {
    const result = await executeProductMasterImport(rows, {
      execute: true,
      confirm: process.env.PRODUCT_MASTER_IMPORT_CONFIRM,
      writer,
      lifecycleEvent: process.env.npm_lifecycle_event,
      vercel: process.env.VERCEL,
    });
    console.log(formatProductMasterReport(result));
    if (!result.wrote) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally {
    await writer.disconnect();
  }
}

void main();
