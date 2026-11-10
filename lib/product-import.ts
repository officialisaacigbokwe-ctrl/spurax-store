import { CATEGORIES, matchCategory } from "@/lib/categories";
export const MAX_ROWS_PER_FILE = 500;
export const BATCH_SIZE = 100;
export const MAX_PRODUCTS_PER_STORE = 2000;

export type ImportRow = {
  name: string;
  category: string;
  price: number;
  stock: number | null;
  description: string | null;
  sizes: string[];
  colors: string[];
  image_url: string | null;
};

export type RawRow = Record<string, unknown>;

export type ValidateResult =
  | { ok: true; row: ImportRow }
  | { ok: false; error: string };

export const TEMPLATE_HEADERS = [
  "name",
  "category",
  "price",
  "stock",
  "description",
  "sizes",
  "colors",
  "image_url",
];

export const TEMPLATE_CSV = [
  TEMPLATE_HEADERS.join(","),
    `EXAMPLE - delete this row,Men's Clothes,25000,20,"Soft cotton, relaxed fit",S|M|L|XL,Black|White,`,
  "EXAMPLE - delete this row too,Beauty & Skincare,4500,,Long-lasting shine,,,https://example.com/photo.jpg",
].join("\r\n");

// ---- Reading a CSV file ----

export function parseCsv(text: string): string[][] {
  const input = text.replace(/^\uFEFF/, "");
  const firstLine = input.split(/\r?\n/, 1)[0] ?? "";

  // Excel in some countries uses ; or tabs instead of commas
  let delimiter = ",";
  let best = 0;

  for (const candidate of [",", ";", "\t"]) {
    const count = firstLine.split(candidate).length - 1;

    if (count > best) {
      best = count;
      delimiter = candidate;
    }
  }

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i++;

      row.push(field);
      field = "";

      if (row.some((value) => value.trim() !== "")) {
        rows.push(row);
      }

      row = [];
    } else {
      field += char;
    }
  }

  row.push(field);

  if (row.some((value) => value.trim() !== "")) {
    rows.push(row);
  }

  return rows;
}

const HEADER_ALIASES: Record<string, string> = {
  name: "name",
  product: "name",
  productname: "name",
  title: "name",
  category: "category",
  type: "category",
  price: "price",
  amount: "price",
  unitprice: "price",
  stock: "stock",
  quantity: "stock",
  qty: "stock",
  inventory: "stock",
  description: "description",
  details: "description",
  sizes: "sizes",
  size: "sizes",
  colors: "colors",
  colours: "colors",
  color: "colors",
  colour: "colors",
  imageurl: "image_url",
  image: "image_url",
  imagelink: "image_url",
  photo: "image_url",
  photourl: "image_url",
};

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function tableToRows(table: string[][]): {
  rows: RawRow[];
  missing: string[];
} {
  const header = table[0].map(normalizeHeader);
  const columns: Record<string, number> = {};

  header.forEach((name, index) => {
    const key = HEADER_ALIASES[name];

    if (key && columns[key] === undefined) {
      columns[key] = index;
    }
  });

  const missing = ["name", "category", "price"].filter(
    (key) => columns[key] === undefined
  );

  const rows = table.slice(1).map((cells) => {
    const raw: RawRow = {};

    for (const [key, index] of Object.entries(columns)) {
      raw[key] = cells[index] ?? "";
    }

    return raw;
  });

  return { rows, missing };
}

// ---- Checking one row ----

function text(value: unknown): string {
  if (typeof value === "number") return String(value);

  return typeof value === "string" ? value.trim() : "";
}

function toList(value: unknown): string[] {
  const items = Array.isArray(value)
    ? value.map((item) => text(item))
    : text(value).split(/[|;,]/);

  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

export function validateRow(raw: unknown): ValidateResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "This row is not valid." };
  }

  const input = raw as RawRow;

  const name = text(input.name);
  const category = text(input.category);

  if (!name) {
    return { ok: false, error: "Product name is missing." };
  }

  if (/^example - delete/i.test(name)) {
    return {
      ok: false,
      error: "This is an example row from the template. Delete it or replace it.",
    };
  }

  if (name.length > 200) {
    return { ok: false, error: "The name is longer than 200 characters." };
  }

    if (!category) {
    return { ok: false, error: "Category is missing." };
  }

  const canonical = matchCategory(category);

  if (!canonical) {
    return {
      ok: false,
      error: `Category not recognised. Use one of: ${CATEGORIES.map((item) => item.name).join(", ")}.`,
    };
  }

  const priceText = text(input.price)
    .replace(/[₦,\s]/g, "")
    .replace(/^ngn/i, "");
  const price = Number(priceText);

  if (!priceText || !Number.isFinite(price) || price <= 0) {
    return { ok: false, error: "Price must be a number above 0." };
  }

  if (price > 100000000) {
    return { ok: false, error: "The price is too large." };
  }

  const stockText = text(input.stock);
  let stock: number | null = null;

  if (stockText !== "") {
    if (!/^\d+$/.test(stockText) || Number(stockText) > 1000000) {
      return {
        ok: false,
        error: "Stock must be a whole number, or empty for unlimited.",
      };
    }

    stock = Number(stockText);
  }

  const description = text(input.description);

  if (description.length > 5000) {
    return { ok: false, error: "The description is too long." };
  }

  const sizes = toList(input.sizes);
  const colors = toList(input.colors);

  if (
    sizes.length > 20 ||
    colors.length > 20 ||
    [...sizes, ...colors].some((item) => item.length > 30)
  ) {
    return {
      ok: false,
      error: "Too many sizes or colours, or one of them is too long.",
    };
  }

  const imageUrl = text(input.image_url);

  if (imageUrl && (!/^https:\/\/\S+$/i.test(imageUrl) || imageUrl.length > 500)) {
    return { ok: false, error: "The image link must start with https://" };
  }

  return {
    ok: true,
    row: {
      name,
            category: canonical,
      price: Math.round(price * 100) / 100,
      stock,
      description: description || null,
      sizes,
      colors,
      image_url: imageUrl || null,
    },
  };
}