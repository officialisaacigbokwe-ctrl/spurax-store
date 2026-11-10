"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getActiveStoreId, setActiveStoreId } from "@/lib/store-context";
import { CATEGORIES } from "@/lib/categories";

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  price: number;
  currency: string;
  image_url: string | null;
  sizes: string[];
  colors: string[];
  is_featured: boolean;
  is_active: boolean;
  stock_quantity: number | null;
};

type Store = {
  id: string;
  name: string;
  slug: string;
  payouts_ready: boolean;
};

// Payments currently work in NGN only.
const PRODUCT_CURRENCY = "NGN";

export default function AdminProductsPage() {
  const supabase = createClient();

  const [products, setProducts] = useState<Product[]>([]);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [existingImage, setExistingImage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [sizes, setSizes] = useState("");
  const [colors, setColors] = useState("");
  const [featured, setFeatured] = useState(false);
  const [active, setActive] = useState(true);
  const [image, setImage] = useState<File | null>(null);

  const editingProduct = editingId
    ? products.find((product) => product.id === editingId) || null
    : null;

  async function loadStoreAndProducts(keepMessage = false) {
    setLoading(true);

    if (!keepMessage) {
      setMessage("");
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setMessage("You need to sign in to manage a store.");
        setLoading(false);
        return;
      }

      let activeStoreId = getActiveStoreId();

      if (activeStoreId) {
        const { data: activeMembership } = await supabase
          .from("store_memberships")
          .select("store_id, role")
          .eq("user_id", user.id)
          .eq("store_id", activeStoreId)
          .maybeSingle();

        if (!activeMembership) {
          activeStoreId = null;
        }
      }

      if (!activeStoreId) {
        const { data: firstMembership, error: membershipError } =
          await supabase
            .from("store_memberships")
            .select("store_id, role")
            .eq("user_id", user.id)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();

        if (membershipError) {
          console.error(membershipError);
          setMessage("Could not find your store membership.");
          setLoading(false);
          return;
        }

        if (!firstMembership) {
          setMessage(
            "You need to create a store before you can add or manage products."
          );
          setLoading(false);
          return;
        }

        const firstStoreId = firstMembership.store_id;
        if (!firstStoreId) {
          setLoading(false);
          return;
        }

        activeStoreId = firstStoreId;
        setActiveStoreId(firstStoreId);
      }

      const { data: storeData, error: storeError } = await supabase
        .from("stores")
        .select("id, name, slug, payouts_ready")
        .eq("id", activeStoreId)
        .maybeSingle();

      if (storeError) {
        console.error(storeError);
        setMessage("Could not load your store.");
        setLoading(false);
        return;
      }

      if (!storeData) {
        setMessage("The selected store could not be found.");
        setLoading(false);
        return;
      }

      setStore(storeData);

      const { data: productData, error: productError } = await supabase
        .from("products")
        .select(
          "id, name, slug, description, category, price, currency, image_url, sizes, colors, is_featured, is_active, stock_quantity"
        )
        .eq("store_id", activeStoreId)
        .order("created_at", { ascending: false });

      if (productError) {
        console.error(productError);
        setMessage("Could not load products.");
      } else {
        setProducts(productData ?? []);
      }
    } catch (error) {
      console.error(error);
      setMessage("Something went wrong while loading your store.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStoreAndProducts();
  }, []);

  function createSlug(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function resetForm() {
    setEditingId(null);
    setExistingImage(null);
    setName("");
    setDescription("");
    setCategory("");
    setPrice("");
    setStock("");
    setSizes("");
    setColors("");
    setFeatured(false);
    setActive(true);
    setImage(null);
    setShowForm(false);
  }

  function startEdit(product: Product) {
    setEditingId(product.id);
    setExistingImage(product.image_url);
    setName(product.name);
    setDescription(product.description || "");
    setCategory(product.category);
    setPrice(String(product.price));
    setStock(
      product.stock_quantity === null ? "" : String(product.stock_quantity)
    );
    setSizes((product.sizes || []).join(", "));
    setColors((product.colors || []).join(", "));
    setFeatured(product.is_featured);
    setActive(product.is_active);
    setImage(null);
    setShowForm(true);
    setMessage("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setImage(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("Please select an image file.");
      event.target.value = "";
      setImage(null);
      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      setMessage("Image must be 5 MB or smaller.");
      event.target.value = "";
      setImage(null);
      return;
    }

    setMessage("");
    setImage(file);
  }

  async function handleSaveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!store) {
      setMessage("Your store could not be found.");
      return;
    }

    if (!name.trim()) {
      setMessage("Product name is required.");
      return;
    }

    if (!category.trim()) {
      setMessage("Category is required.");
      return;
    }

    if (!price || Number(price) < 0) {
      setMessage("Enter a valid price.");
      return;
    }

    const stockText = stock.trim();

    if (
      stockText !== "" &&
      (!Number.isFinite(Number(stockText)) || Number(stockText) < 0)
    ) {
      setMessage("Enter a valid stock number, or leave it empty for unlimited.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      // When editing, keep the current image unless a new one is chosen.
      let imageUrl: string | null = editingId ? existingImage : null;

      if (image) {
        const fileExtension =
          image.name.split(".").pop()?.toLowerCase() || "jpg";

        const safeName = createSlug(name) || "product";

        const filePath = `${store.id}/${safeName}-${Date.now()}.${fileExtension}`;

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(filePath, image, {
            cacheControl: "3600",
            upsert: false,
            contentType: image.type,
          });

        if (uploadError) {
          console.error("Product image upload error:", uploadError);
          throw new Error(
            uploadError.message || "Could not upload the product image."
          );
        }

        const { data: publicUrlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(filePath);

        imageUrl = publicUrlData.publicUrl;
      }

      const fields = {
        name: name.trim(),
        description: description.trim() || null,
        category: category.trim(),
        price: Number(price),
        currency: PRODUCT_CURRENCY,
        image_url: imageUrl,
        stock_quantity:
          stockText === "" ? null : Math.floor(Number(stockText)),
        sizes: sizes
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        colors: colors
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        is_featured: featured,
        is_active: active,
      };

      if (editingId) {
        const { data, error: updateError } = await supabase
          .from("products")
          .update(fields)
          .eq("id", editingId)
          .eq("store_id", store.id)
          .select("id");

        if (updateError) {
          throw updateError;
        }

        if (!data || data.length === 0) {
          throw new Error("Could not save your changes. Please try again.");
        }

        setMessage("Product updated successfully.");
      } else {
        const slug = `${createSlug(name)}-${Date.now()}`;

        const { error: productError } = await supabase
          .from("products")
          .insert({
            store_id: store.id,
            slug,
            ...fields,
          });

        if (productError) {
          throw productError;
        }

        setMessage("Product created successfully.");
      }

      resetForm();

      await loadStoreAndProducts(true);
    } catch (error: any) {
      console.error("PRODUCT SAVE ERROR:", error);

      setMessage(
        error?.message ||
          error?.details ||
          error?.hint ||
          "Something went wrong while saving the product."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleProduct(product: Product) {
    if (!store) return;

    const { data, error } = await supabase
      .from("products")
      .update({
        is_active: !product.is_active,
      })
      .eq("id", product.id)
      .eq("store_id", store.id)
      .select("id");

    if (error || !data || data.length === 0) {
      console.error(error);
      setMessage("Could not update the product.");
      return;
    }

    await loadStoreAndProducts();
  }

  async function updateStock(product: Product) {
    if (!store) return;

    const current =
      product.stock_quantity === null ? "" : String(product.stock_quantity);

    const input = window.prompt(
      "How many are in stock? Leave empty for unlimited stock.",
      current
    );

    if (input === null) return;

    const trimmed = input.trim();
    let nextStock: number | null = null;

    if (trimmed !== "") {
      const parsed = Number(trimmed);

      if (!Number.isFinite(parsed) || parsed < 0) {
        setMessage(
          "Enter a valid stock number, or leave it empty for unlimited."
        );
        return;
      }

      nextStock = Math.floor(parsed);
    }

    const { data, error } = await supabase
      .from("products")
      .update({ stock_quantity: nextStock })
      .eq("id", product.id)
      .eq("store_id", store.id)
      .select("id");

    if (error || !data || data.length === 0) {
      console.error(error);
      setMessage("Could not update the stock.");
      return;
    }

    setMessage("Stock updated.");
    await loadStoreAndProducts(true);
  }

  async function deleteProduct(product: Product) {
    if (!store) return;

    const confirmed = window.confirm(
      `Delete "${product.name}"? This cannot be undone.`
    );

    if (!confirmed) return;

    const { data, error } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id)
      .eq("store_id", store.id)
      .select("id");

    if (error || !data || data.length === 0) {
      console.error(error);
      setMessage(
        "Could not delete this product. If it is already part of an order, deactivate it instead."
      );
      return;
    }

    if (editingId === product.id) {
      resetForm();
    }

    setMessage("Product deleted.");
    await loadStoreAndProducts(true);
  }

  function stockLabel(product: Product) {
    if (product.stock_quantity === null) return "Unlimited stock";
    if (product.stock_quantity === 0) return "Out of stock";
    return `${product.stock_quantity} in stock`;
  }

  return (
    <main className="min-h-screen bg-[#f7f7f7]">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-gray-500">
              {store?.name || "STORE ADMIN"}
            </p>

            <h1 className="mt-2 text-4xl font-bold tracking-tight">
              Products
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Manage your products, pricing, images, stock, and availability.
            </p>
          </div>

          {store ? (
            <button
              type="button"
              onClick={() => {
                if (showForm) {
                  resetForm();
                } else {
                  setShowForm(true);
                }
                setMessage("");
              }}
              className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              {showForm ? "Close Form" : "Add Product"}
            </button>
          ) : (
            <a
              href="/create-store"
              className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Create Your Store
            </a>
          )}
        </div>

        {store && !store.payouts_ready && (
          <div className="mt-6 rounded-2xl border border-yellow-200 bg-yellow-50 px-5 py-4 text-sm text-yellow-800">
            <p className="font-semibold">
              Your products are hidden from buyers for now.
            </p>

            <p className="mt-1 leading-6">
              Connect your payout account so customers can buy from your
              store. Your products will appear in the shop as soon as it is
              connected.
            </p>

            <a
              href="/seller/payments"
              className="mt-3 inline-flex rounded-full bg-black px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-gray-800"
            >
              Connect payout account
            </a>
          </div>
        )}

        {message && (
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white px-5 py-5 text-sm">
            <p>{message}</p>

            {!store && !loading && (
              <a
                href="/create-store"
                className="mt-4 inline-flex rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Create Your Store
              </a>
            )}
          </div>
        )}

                {store && (
          <div className="mt-6">
            <a
              href="/seller/products/import"
              className="inline-flex items-center rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold transition hover:border-black"
            >
              Import many products from a spreadsheet
            </a>
          </div>
        )}

        {showForm && store && (
          <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm md:p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold">
                {editingId ? "Edit Product" : "Add New Product"}
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                {editingId
                  ? "Change any detail below and save. Leave the image empty to keep the current one."
                  : "Add a product and upload its image directly from your store dashboard."}
              </p>
            </div>

            <form
              onSubmit={handleSaveProduct}
              className="grid gap-6 md:grid-cols-2"
            >
              <div>
                <label className="text-sm font-medium">
                  Product name
                </label>

                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Classic Black T-Shirt"
                  className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="text-sm font-medium">
                  Category
                </label>

                                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-black"
                >
                  <option value="">Choose a category</option>

                  {category &&
                    !CATEGORIES.some((item) => item.name === category) && (
                      <option value={category}>
                        {category} (old category, please change)
                      </option>
                    )}

                  {CATEGORIES.map((item) => (
                    <option key={item.name} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">
                  Price (NGN)
                </label>

                <input
                  type="number"
                  min="0"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder="25000"
                  className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-black"
                />

                <p className="mt-2 text-xs text-gray-400">
                  Prices are in Nigerian Naira for now. More currencies are
                  coming.
                </p>

                {editingProduct &&
                  editingProduct.currency !== PRODUCT_CURRENCY && (
                    <p className="mt-2 text-xs font-medium text-yellow-700">
                      This product was priced in {editingProduct.currency}.
                      Saving will convert it to NGN, so check the price above.
                    </p>
                  )}
              </div>

              <div>
                <label className="text-sm font-medium">
                  Stock quantity
                </label>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={stock}
                  onChange={(event) => setStock(event.target.value)}
                  placeholder="Leave empty for unlimited"
                  className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-black"
                />

                <p className="mt-2 text-xs text-gray-400">
                  How many you have available. Leave empty if you do not
                  track stock.
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium">
                  Description
                </label>

                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Describe the product..."
                  rows={5}
                  className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-black"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium">
                  Product image
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="mt-2 block w-full rounded-2xl border border-gray-200 bg-white p-3 text-sm"
                />

                {image ? (
                  <div className="mt-4 flex items-center gap-4">
                    <div className="h-24 w-24 overflow-hidden rounded-2xl bg-gray-100">
                      <img
                        src={URL.createObjectURL(image)}
                        alt="Product preview"
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div>
                      <p className="text-sm font-medium">{image.name}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {(image.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                ) : (
                  editingId &&
                  existingImage && (
                    <div className="mt-4 flex items-center gap-4">
                      <div className="h-24 w-24 overflow-hidden rounded-2xl bg-gray-100">
                        <img
                          src={existingImage}
                          alt="Current product"
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <p className="text-xs text-gray-500">
                        Current image. Choose a new file to replace it.
                      </p>
                    </div>
                  )
                )}
              </div>

              <div>
                <label className="text-sm font-medium">
                  Sizes
                </label>

                <input
                  value={sizes}
                  onChange={(event) => setSizes(event.target.value)}
                  placeholder="S, M, L, XL"
                  className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-black"
                />

                <p className="mt-2 text-xs text-gray-400">
                  Separate sizes with commas.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">
                  Colors
                </label>

                <input
                  value={colors}
                  onChange={(event) => setColors(event.target.value)}
                  placeholder="Black, White"
                  className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-black"
                />

                <p className="mt-2 text-xs text-gray-400">
                  Separate colors with commas.
                </p>
              </div>

              <div className="flex flex-col gap-4 rounded-2xl bg-[#f7f7f7] p-5 sm:flex-row sm:items-center sm:gap-8 md:col-span-2">
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={featured}
                    onChange={(event) =>
                      setFeatured(event.target.checked)
                    }
                    className="h-4 w-4"
                  />
                  Featured product
                </label>

                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(event) =>
                      setActive(event.target.checked)
                    }
                    className="h-4 w-4"
                  />
                  Active product
                </label>
              </div>

              <div className="flex flex-wrap justify-end gap-3 md:col-span-2">
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setMessage("");
                    }}
                    className="rounded-full border border-gray-200 px-7 py-3 text-sm font-semibold transition hover:border-black"
                  >
                    Cancel
                  </button>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-black px-7 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save Changes"
                      : "Create Product"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {store ? `${store.name} Products` : "All Products"}
            </h2>

            <p className="text-sm text-gray-500">
              {products.length} product
              {products.length === 1 ? "" : "s"}
            </p>
          </div>

          {loading ? (
            <div className="rounded-3xl bg-white px-6 py-16 text-center">
              <p className="text-sm text-gray-500">
                Loading products...
              </p>
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-3xl bg-white px-6 py-16 text-center">
              <h3 className="text-xl font-semibold">
                No products yet
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Add your first product using the button above.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
              <div className="divide-y divide-gray-100">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-[#f3f3f3]">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-gray-400">
                            No image
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <h3 className="font-semibold">
                          {product.name}
                        </h3>

                        <p className="mt-1 text-sm text-gray-500">
                          {product.category}
                        </p>

                        <p className="mt-1 text-sm font-medium">
                          {product.currency}{" "}
                          {Number(product.price).toLocaleString()}
                        </p>

                        <p
                          className={`mt-1 text-xs ${
                            product.stock_quantity === 0
                              ? "font-semibold text-red-600"
                              : "text-gray-500"
                          }`}
                        >
                          {stockLabel(product)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          product.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {product.is_active ? "Active" : "Inactive"}
                      </span>

                      <button
                        type="button"
                        onClick={() => startEdit(product)}
                        className="rounded-full bg-black px-4 py-2 text-xs font-semibold text-white transition hover:bg-gray-800"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => updateStock(product)}
                        className="rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold transition hover:bg-gray-100"
                      >
                        Update stock
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleProduct(product)}
                        className="rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold transition hover:bg-gray-100"
                      >
                        {product.is_active
                          ? "Deactivate"
                          : "Activate"}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteProduct(product)}
                        className="rounded-full border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}