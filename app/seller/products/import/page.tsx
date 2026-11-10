"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getActiveStoreId, setActiveStoreId } from "@/lib/store-context";
import {
  BATCH_SIZE,
  MAX_ROWS_PER_FILE,
  RawRow,
  TEMPLATE_CSV,
  ValidateResult,
  parseCsv,
  tableToRows,
  validateRow,
} from "@/lib/product-import";

type Parsed = {
  line: number;
  raw: RawRow;
  result: ValidateResult;
  duplicate: boolean;
  selected: boolean;
};

type Summary = {
  imported: number;
  failed: { line: number; error: string }[];
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ImportProductsPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState("");
  const [payoutsReady, setPayoutsReady] = useState(true);
  const [existingNames, setExistingNames] = useState<Set<string>>(new Set());

  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<Parsed[]>([]);
  const [error, setError] = useState("");
  const [makeActive, setMakeActive] = useState(true);

  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);

  async function loadStore() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Please sign in to import products.");
      setLoading(false);
      return;
    }

    let activeId = getActiveStoreId();

    if (activeId) {
      const { data: membership } = await supabase
        .from("store_memberships")
        .select("store_id")
        .eq("user_id", user.id)
        .eq("store_id", activeId)
        .maybeSingle();

      if (!membership) {
        activeId = null;
      }
    }

    if (!activeId) {
      const { data: first } = await supabase
        .from("store_memberships")
        .select("store_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      activeId = first?.store_id ?? null;

      if (activeId) {
        setActiveStoreId(activeId);
      }
    }

    if (activeId) {
      const { data: store } = await supabase
        .from("stores")
        .select("id, name, payouts_ready")
        .eq("id", activeId)
        .maybeSingle();

      if (store) {
        setStoreId(store.id);
        setStoreName(store.name);
        setPayoutsReady(store.payouts_ready);

        const { data: products } = await supabase
          .from("products")
          .select("name")
          .eq("store_id", store.id)
          .limit(5000);

        setExistingNames(
          new Set(
            (products ?? []).map((product) => product.name.trim().toLowerCase())
          )
        );
      }
    }

    setLoading(false);
  }

  useEffect(() => {
    loadStore();
  }, []);

  function downloadTemplate() {
    const blob = new Blob(["\uFEFF" + TEMPLATE_CSV], {
      type: "text/csv;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "spurax-products-template.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  async function handleFile(file: File) {
    setError("");
    setSummary(null);
    setRows([]);
    setFileName("");

    if (!/\.(csv|txt)$/i.test(file.name)) {
      setError(
        "Please choose a .csv file. In Excel, use Save As and pick CSV UTF-8."
      );
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("That file is too large. The limit is 2 MB.");
      return;
    }

    const content = await file.text();
    const table = parseCsv(content);

    if (table.length < 2) {
      setError("We could not find any product rows in that file.");
      return;
    }

    const { rows: raws, missing } = tableToRows(table);

    if (missing.length > 0) {
      setError(
        `The file is missing these columns: ${missing.join(", ")}. Download the template to see the right columns.`
      );
      return;
    }

    if (raws.length > MAX_ROWS_PER_FILE) {
      setError(
        `That file has ${raws.length} rows. Please split it into files of ${MAX_ROWS_PER_FILE} rows or fewer.`
      );
      return;
    }

    const seen = new Set<string>();

    const parsed: Parsed[] = raws.map((raw, index) => {
      const result = validateRow(raw);
      const key = String(raw.name ?? "")
        .trim()
        .toLowerCase();

      const duplicate =
        result.ok && (existingNames.has(key) || seen.has(key));

      if (result.ok) {
        seen.add(key);
      }

      return {
        line: index + 2,
        raw,
        result,
        duplicate,
        selected: result.ok && !duplicate,
      };
    });

    setFileName(file.name);
    setRows(parsed);
  }

  function toggle(line: number) {
    setRows((current) =>
      current.map((row) =>
        row.line === line && row.result.ok
          ? { ...row, selected: !row.selected }
          : row
      )
    );
  }

  function selectAllReady() {
    setRows((current) =>
      current.map((row) => ({
        ...row,
        selected: row.result.ok && !row.duplicate,
      }))
    );
  }

  function clearSelection() {
    setRows((current) => current.map((row) => ({ ...row, selected: false })));
  }

  const chosen = rows.filter((row) => row.selected && row.result.ok);
  const errorCount = rows.filter((row) => !row.result.ok).length;
  const duplicateCount = rows.filter((row) => row.duplicate).length;
  const noImageCount = chosen.filter(
    (row) => !String(row.raw.image_url ?? "").trim()
  ).length;

  async function runImport() {
    if (!storeId || chosen.length === 0) return;

    setImporting(true);
    setProgress(0);
    setError("");

    let imported = 0;
    const failed: { line: number; error: string }[] = [];

    for (let i = 0; i < chosen.length; i += BATCH_SIZE) {
      const batch = chosen.slice(i, i + BATCH_SIZE);

      try {
        const response = await fetch("/api/seller/products/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storeId,
            makeActive,
            rows: batch.map((row) => row.raw),
          }),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          batch.forEach((row) =>
            failed.push({
              line: row.line,
              error: data?.error || "Could not import this row.",
            })
          );

          if (response.status === 401 || response.status === 403) {
            break;
          }
        } else {
          imported += Number(data?.imported) || 0;

          for (const item of data?.failed ?? []) {
            failed.push({
              line: batch[item.index]?.line ?? 0,
              error: item.error,
            });
          }
        }
      } catch {
        batch.forEach((row) =>
          failed.push({ line: row.line, error: "Connection problem." })
        );
      }

      setProgress(Math.min(i + BATCH_SIZE, chosen.length));
    }

    setSummary({ imported, failed });
    setRows([]);
    setFileName("");
    setImporting(false);

    await loadStore();
  }

  if (loading) {
    return (
      <main>
        <div className="rounded-3xl bg-white p-10 shadow-sm">
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </main>
    );
  }

  if (!storeId) {
    return (
      <main>
        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold tracking-tight">Import products</h1>

          <p className="mt-3 text-sm text-gray-500">
            {error || "You need a store before you can import products."}
          </p>

          <Link
            href="/create-store"
            className="mt-6 inline-flex rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
          >
            Create store
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main>
      <Link
        href="/seller/products"
        className="text-sm font-medium text-gray-500 hover:text-black"
      >
        ← Back to products
      </Link>

      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
        {storeName}
      </p>

      <h1 className="mt-3 text-4xl font-bold tracking-tight">
        Import products from a spreadsheet
      </h1>

      <p className="mt-2 max-w-2xl text-gray-500">
        Add many products at once. You can review everything before it is
        saved.
      </p>

      {!payoutsReady && (
        <div className="mt-6 rounded-2xl border border-yellow-200 bg-yellow-50 px-5 py-4 text-sm text-yellow-800">
          Your products stay hidden from buyers until you{" "}
          <Link href="/seller/payments" className="font-semibold underline">
            connect your payout account
          </Link>
          .
        </div>
      )}

      {/* RESULT */}
      {summary && (
        <section className="mt-8 rounded-3xl bg-white p-7 shadow-sm">
          <h2 className="text-xl font-semibold">Import finished</h2>

          <p className="mt-3 text-sm text-gray-600">
            <span className="font-semibold text-green-700">
              {summary.imported} product{summary.imported === 1 ? "" : "s"}{" "}
              imported.
            </span>
            {summary.failed.length > 0 &&
              ` ${summary.failed.length} could not be imported.`}
          </p>

          {summary.failed.length > 0 && (
            <ul className="mt-4 max-h-48 space-y-1 overflow-auto rounded-2xl bg-red-50 p-4 text-sm text-red-700">
              {summary.failed.map((item, index) => (
                <li key={index}>
                  Row {item.line}: {item.error}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/seller/products"
              className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              View my products
            </Link>

            <button
              type="button"
              onClick={() => setSummary(null)}
              className="rounded-full border border-gray-200 px-6 py-3 text-sm font-semibold transition hover:border-black"
            >
              Import another file
            </button>
          </div>
        </section>
      )}

      {/* STEPS */}
      {!summary && rows.length === 0 && (
        <section className="mt-8 space-y-6">
          <div className="rounded-3xl bg-white p-7 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Step 1
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Download the template
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Open it in Excel or Google Sheets and add one product per row.
              Delete the two example rows. Leave stock empty if you do not want
              to count it. Separate sizes and colours with a bar, like
              S|M|L.
            </p>

            <button
              type="button"
              onClick={downloadTemplate}
              className="mt-5 rounded-full border border-black px-6 py-3 text-sm font-semibold transition hover:bg-black hover:text-white"
            >
              Download template (.csv)
            </button>
          </div>

          <div className="rounded-3xl bg-white p-7 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Step 2
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Upload your filled file
            </h2>

            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-gray-500">
              <li>
                <span className="font-medium text-gray-700">Excel:</span> File,
                Save As, then choose &quot;CSV UTF-8&quot;.
              </li>
              <li>
                <span className="font-medium text-gray-700">Google Sheets:</span>{" "}
                File, Download, Comma-separated values (.csv).
              </li>
              <li>
                Prices are in naira. Up to {MAX_ROWS_PER_FILE} products per
                file.
              </li>
              <li>
                <span className="font-medium text-gray-700">Photos:</span> the
                image_url column needs a direct https link to a picture. Leave
                it empty and add photos later with Edit.
              </li>
            </ul>

            <label className="mt-5 inline-flex cursor-pointer rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800">
              Choose file

              <input
                type="file"
                accept=".csv,text/csv,text/plain"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];

                  if (file) {
                    handleFile(file);
                  }

                  event.target.value = "";
                }}
              />
            </label>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </section>
      )}

      {/* PREVIEW */}
      {!summary && rows.length > 0 && (
        <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Review your products</h2>

              <p className="mt-1 text-sm text-gray-500">
                {fileName} · {rows.length} row{rows.length === 1 ? "" : "s"}
                {errorCount > 0 && ` · ${errorCount} with problems`}
                {duplicateCount > 0 && ` · ${duplicateCount} already in your store`}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <button
                type="button"
                onClick={selectAllReady}
                className="rounded-full border border-gray-200 px-4 py-2 transition hover:border-black"
              >
                Select all ready
              </button>

              <button
                type="button"
                onClick={clearSelection}
                className="rounded-full border border-gray-200 px-4 py-2 transition hover:border-black"
              >
                Clear selection
              </button>
            </div>
          </div>

          <div className="mt-5 max-h-[28rem] overflow-auto rounded-2xl border border-gray-200">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="sticky top-0 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="w-10 px-4 py-3"></th>
                  <th className="w-14 px-2 py-3">Row</th>
                  <th className="px-3 py-3">Product</th>
                  <th className="px-3 py-3">Category</th>
                  <th className="px-3 py-3">Price</th>
                  <th className="px-3 py-3">Stock</th>
                  <th className="px-3 py-3">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => (
                  <tr key={row.line} className={row.result.ok ? "" : "bg-red-50/40"}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={row.selected}
                        disabled={!row.result.ok}
                        onChange={() => toggle(row.line)}
                        className="h-4 w-4"
                      />
                    </td>

                    <td className="px-2 py-3 text-gray-400">{row.line}</td>

                    <td className="max-w-[220px] truncate px-3 py-3 font-medium">
                      {String(row.raw.name ?? "") || "-"}
                    </td>

                    <td className="px-3 py-3 text-gray-600">
                      {String(row.raw.category ?? "") || "-"}
                    </td>

                    <td className="px-3 py-3">
                      {row.result.ok ? formatPrice(row.result.row.price) : "-"}
                    </td>

                    <td className="px-3 py-3">
                      {row.result.ok
                        ? row.result.row.stock === null
                          ? "Unlimited"
                          : row.result.row.stock
                        : "-"}
                    </td>

                    <td className="px-3 py-3">
                      {!row.result.ok ? (
                        <span className="text-xs font-medium text-red-600">
                          {row.result.error}
                        </span>
                      ) : row.duplicate ? (
                        <span className="rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-700">
                          Already exists
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                          Ready
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 ${
                makeActive ? "border-black" : "border-gray-200"
              }`}
            >
              <input
                type="radio"
                name="visibility"
                checked={makeActive}
                onChange={() => setMakeActive(true)}
                className="mt-1"
              />

              <span className="text-sm">
                <span className="font-semibold">Active</span>
                <span className="block text-gray-500">
                  Buyers can see and buy them straight away.
                </span>
              </span>
            </label>

            <label
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 ${
                !makeActive ? "border-black" : "border-gray-200"
              }`}
            >
              <input
                type="radio"
                name="visibility"
                checked={!makeActive}
                onChange={() => setMakeActive(false)}
                className="mt-1"
              />

              <span className="text-sm">
                <span className="font-semibold">Hidden</span>
                <span className="block text-gray-500">
                  Save them now and switch them on later.
                </span>
              </span>
            </label>
          </div>

          {makeActive && noImageCount > 0 && (
            <p className="mt-4 rounded-2xl bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
              {noImageCount} of the selected product
              {noImageCount === 1 ? " has" : "s have"} no photo. Products
              without photos sell less. You can add photos afterwards with Edit,
              or import them as Hidden first.
            </p>
          )}

          {error && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={importing || chosen.length === 0}
              onClick={runImport}
              className="rounded-full bg-black px-7 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {importing
                ? `Importing ${progress} of ${chosen.length}...`
                : `Import ${chosen.length} product${chosen.length === 1 ? "" : "s"}`}
            </button>

            <button
              type="button"
              disabled={importing}
              onClick={() => {
                setRows([]);
                setFileName("");
              }}
              className="rounded-full border border-gray-200 px-6 py-3 text-sm font-semibold transition hover:border-black disabled:opacity-50"
            >
              Choose a different file
            </button>
          </div>
        </section>
      )}
    </main>
  );
}