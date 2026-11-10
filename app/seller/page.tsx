"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getActiveStoreId, setActiveStoreId } from "@/lib/store-context";
import { formatCurrency } from "@/lib/currency";
import SalesChart, { ChartPoint } from "@/components/SalesChart";

type Store = {
  id: string;
  name: string;
  slug: string | null;
  payouts_ready: boolean;
};

type Product = {
  id: string;
  name: string;
  is_active: boolean;
  stock_quantity: number | null;
};

type Order = {
  id: string;
  user_id: string | null;
  total: number;
  status: string;
  created_at: string;
  customer_name: string | null;
};

type ItemRow = {
  product_name: string;
  quantity: number;
  unit_price: number;
};

const ORDER_LIMIT = 2000;

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

// Stops spreadsheet programs from running text as a formula.
function safeCell(value: string | number) {
  const text = String(value);

  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function Change({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null;

  if (previous === 0) {
    return (
      <span className="text-xs font-semibold text-green-600">New this month</span>
    );
  }

  const percent = ((current - previous) / previous) * 100;

  if (Math.abs(percent) < 0.5) {
    return <span className="text-xs text-gray-400">Same as last month</span>;
  }

  return (
    <span
      className={`text-xs font-semibold ${
        percent > 0 ? "text-green-600" : "text-red-600"
      }`}
    >
      {percent > 0 ? "▲" : "▼"} {Math.abs(Math.round(percent))}% vs last month
    </span>
  );
}

export default function SellerDashboardPage() {
  const supabase = createClient();

  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<ItemRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"30d" | "12m">("30d");

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        let activeStoreId = getActiveStoreId();

        if (activeStoreId) {
          const { data: activeMembership } = await supabase
            .from("store_memberships")
            .select("store_id")
            .eq("user_id", user.id)
            .eq("store_id", activeStoreId)
            .maybeSingle();

          if (!activeMembership) {
            activeStoreId = null;
          }
        }

        if (!activeStoreId) {
          const { data: firstMembership } = await supabase
            .from("store_memberships")
            .select("store_id")
            .eq("user_id", user.id)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();

          if (!firstMembership?.store_id) {
            setLoading(false);
            return;
          }

          activeStoreId = firstMembership.store_id;
        }

        if (!activeStoreId) {
          setLoading(false);
          return;
        }

        setActiveStoreId(activeStoreId);

        const { data: storeData } = await supabase
          .from("stores")
          .select("id, name, slug, payouts_ready")
          .eq("id", activeStoreId)
          .maybeSingle();

        if (!storeData) {
          setLoading(false);
          return;
        }

        setStore(storeData);

        const now = new Date();
        const from = new Date(now.getFullYear(), now.getMonth() - 12, 1);

        const [productResult, orderResult] = await Promise.all([
          supabase
            .from("products")
            .select("id, name, is_active, stock_quantity")
            .eq("store_id", storeData.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("orders")
            .select("id, user_id, total, status, created_at, customer_name")
            .eq("store_id", storeData.id)
            .eq("payment_status", "paid")
            .gte("created_at", from.toISOString())
            .order("created_at", { ascending: false })
            .limit(ORDER_LIMIT),
        ]);

        const loadedOrders = (orderResult.data ?? []) as Order[];

        setProducts(productResult.data ?? []);
        setOrders(loadedOrders);
        setLoading(false);

        // Products sold this month (loaded in small groups)
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const ids = loadedOrders
          .filter((order) => new Date(order.created_at) >= monthStart)
          .map((order) => order.id);

        const rows: ItemRow[] = [];

        for (let i = 0; i < ids.length; i += 80) {
          const { data } = await supabase
            .from("order_items")
            .select("product_name, quantity, unit_price")
            .in("order_id", ids.slice(i, i + 80));

          rows.push(...((data ?? []) as ItemRow[]));
        }

        setItems(rows);
      } catch (error) {
        console.error("SELLER DASHBOARD ERROR:", error);
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const sum = (list: Order[]) =>
      list.reduce((total, order) => total + Number(order.total), 0);

    const thisMonth = orders.filter(
      (order) => new Date(order.created_at) >= monthStart
    );

    const lastMonth = orders.filter((order) => {
      const date = new Date(order.created_at);

      return date >= prevStart && date < monthStart;
    });

    // Totals per day and per month
    const perDay = new Map<string, { value: number; orders: number }>();
    const perMonth = new Map<string, { value: number; orders: number }>();

    for (const order of orders) {
      const date = new Date(order.created_at);

      for (const [map, key] of [
        [perDay, dateKey(date)],
        [perMonth, monthKey(date)],
      ] as const) {
        const current = map.get(key) ?? { value: 0, orders: 0 };

        current.value += Number(order.total);
        current.orders += 1;
        map.set(key, current);
      }
    }

    const days: ChartPoint[] = [];

    for (let i = 29; i >= 0; i--) {
      const date = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - i
      );
      const entry = perDay.get(dateKey(date)) ?? { value: 0, orders: 0 };

      days.push({
        label: String(date.getDate()),
        value: entry.value,
        orders: entry.orders,
        tooltip: `${date.toLocaleDateString("en-NG", {
          day: "numeric",
          month: "short",
        })}: ${formatCurrency(entry.value, "NGN")} (${plural(entry.orders, "order")})`,
        showLabel: i % 5 === 0,
      });
    }

    const months: ChartPoint[] = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const entry = perMonth.get(monthKey(date)) ?? { value: 0, orders: 0 };

      months.push({
        label: date.toLocaleDateString("en-NG", { month: "short" }),
        value: entry.value,
        orders: entry.orders,
        tooltip: `${date.toLocaleDateString("en-NG", {
          month: "long",
          year: "numeric",
        })}: ${formatCurrency(entry.value, "NGN")} (${plural(entry.orders, "order")})`,
        showLabel: true,
      });
    }

    // Best day this month
    let bestDay: { date: Date; value: number } | null = null;

    for (let d = new Date(monthStart); d <= today; d.setDate(d.getDate() + 1)) {
      const entry = perDay.get(dateKey(d));

      if (entry && entry.value > (bestDay?.value ?? 0)) {
        bestDay = { date: new Date(d), value: entry.value };
      }
    }

    // Customers
    const ordersByCustomer = new Map<string, number>();

    for (const order of orders) {
      if (order.user_id) {
        ordersByCustomer.set(
          order.user_id,
          (ordersByCustomer.get(order.user_id) ?? 0) + 1
        );
      }
    }

    const monthCustomers = new Set(
      thisMonth.map((order) => order.user_id).filter(Boolean) as string[]
    );

    const repeatCustomers = [...monthCustomers].filter(
      (id) => (ordersByCustomer.get(id) ?? 0) > 1
    ).length;

    const toShip = orders.filter(
      (order) => order.status === "pending" || order.status === "processing"
    ).length;

    return {
      days,
      months,
      thisMonth,
      lastMonthName: prevStart.toLocaleDateString("en-NG", { month: "long" }),
      monthName: now.toLocaleDateString("en-NG", {
        month: "long",
        year: "numeric",
      }),
      totalYear: sum(orders),
      monthSales: sum(thisMonth),
      prevSales: sum(lastMonth),
      monthOrders: thisMonth.length,
      prevOrders: lastMonth.length,
      average: thisMonth.length ? sum(thisMonth) / thisMonth.length : 0,
      prevAverage: lastMonth.length ? sum(lastMonth) / lastMonth.length : 0,
      customers: monthCustomers.size,
      repeatCustomers,
      bestDay,
      toShip,
    };
  }, [orders]);

  const topProducts = useMemo(() => {
    if (!items) return null;

    const totals = new Map<string, { units: number; revenue: number }>();

    for (const item of items) {
      const current = totals.get(item.product_name) ?? { units: 0, revenue: 0 };

      current.units += item.quantity;
      current.revenue += Number(item.unit_price) * item.quantity;
      totals.set(item.product_name, current);
    }

    return [...totals.entries()]
      .map(([name, value]) => ({ name, ...value }))
      .sort((a, b) => b.units - a.units || b.revenue - a.revenue)
      .slice(0, 5);
  }, [items]);

  const itemsSold = items
    ? items.reduce((total, item) => total + item.quantity, 0)
    : null;

  function downloadReport() {
    const header = ["Order", "Date", "Customer", "Status", "Total (NGN)"];

    const lines = stats.thisMonth.map((order) => [
      order.id.slice(0, 8).toUpperCase(),
      new Date(order.created_at).toLocaleDateString("en-NG"),
      order.customer_name ?? "",
      order.status,
      Number(order.total),
    ]);

    const csv = [header, ...lines]
      .map((line) =>
        line
          .map((cell) => `"${safeCell(cell).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `orders-${stats.monthName.replace(/\s+/g, "-").toLowerCase()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  const activeProducts = products.filter((product) => product.is_active).length;
  const outOfStock = products.filter((product) => product.stock_quantity === 0);
  const lowStock = products.filter(
    (product) =>
      product.stock_quantity !== null &&
      product.stock_quantity > 0 &&
      product.stock_quantity <= 3
  );

  const recentOrders = orders.slice(0, 5);

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-NG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function statusLabel(status: string) {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  if (loading) {
    return (
      <main>
        <div className="rounded-3xl bg-white p-10">
          <p className="text-sm text-gray-500">
            Loading your seller dashboard...
          </p>
        </div>
      </main>
    );
  }

  if (!store) {
    return (
      <main>
        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
            SPURAX SELLER CENTER
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            Create your store
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-gray-500">
            You need a store before you can access the seller dashboard.
          </p>

          <Link
            href="/create-store"
            className="mt-6 inline-flex rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Create Store
          </Link>
        </div>
      </main>
    );
  }

  const recapLine =
    stats.prevSales > 0
      ? stats.monthSales >= stats.prevSales
        ? `Sales are up ${Math.round(((stats.monthSales - stats.prevSales) / stats.prevSales) * 100)}% compared with ${stats.lastMonthName}.`
        : `Sales are down ${Math.round(((stats.prevSales - stats.monthSales) / stats.prevSales) * 100)}% compared with ${stats.lastMonthName}, with the month still running.`
      : stats.monthSales > 0
        ? `You have made ${formatCurrency(stats.monthSales, "NGN")} so far this month. Keep going.`
        : "No sales yet this month. Share your store link to get your first order.";

  return (
    <main>
      {/* HEADER */}
      <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            SPURAX SELLER CENTER
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            Welcome back.
          </h1>

          <p className="mt-2 text-gray-500">
            Here is how{" "}
            <span className="font-medium text-black">{store.name}</span> is
            doing.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/seller/products"
            className="inline-flex items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            + Add Product
          </Link>

          {store.slug && (
            <Link
              href={`/store/${store.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-black px-5 py-3 text-sm font-semibold transition hover:bg-black hover:text-white"
            >
              View Store
            </Link>
          )}
        </div>
      </div>

      {/* PAYOUT NOTICE */}
      {!store.payouts_ready && (
        <div className="mt-8 rounded-2xl border border-yellow-200 bg-yellow-50 px-5 py-4 text-sm text-yellow-800">
          <p className="font-semibold">Your store is not selling yet.</p>

          <p className="mt-1 leading-6">
            Connect your payout account so customers can buy from you. Your
            products stay hidden from buyers until you do.
          </p>

          <Link
            href="/seller/payments"
            className="mt-3 inline-flex rounded-full bg-black px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-gray-800"
          >
            Connect payout account
          </Link>
        </div>
      )}

      {/* STATS */}
      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Sales, last 12 months</p>
          <p className="mt-3 text-3xl font-bold">
            {formatCurrency(stats.totalYear, "NGN")}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Before Spurax and payment fees
          </p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Sales this month</p>
          <p className="mt-3 text-3xl font-bold">
            {formatCurrency(stats.monthSales, "NGN")}
          </p>
          <p className="mt-1">
            <Change current={stats.monthSales} previous={stats.prevSales} />
          </p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Paid orders this month</p>
          <p className="mt-3 text-3xl font-bold">{stats.monthOrders}</p>
          <p className="mt-1 text-xs text-gray-400">
            {plural(activeProducts, "active product")}
          </p>
        </div>

        <Link
          href="/seller/orders"
          className={`rounded-3xl p-6 shadow-sm transition hover:-translate-y-0.5 ${
            stats.toShip > 0 ? "bg-black text-white" : "bg-white"
          }`}
        >
          <p
            className={`text-sm ${
              stats.toShip > 0 ? "text-white/60" : "text-gray-500"
            }`}
          >
            To ship
          </p>
          <p className="mt-3 text-3xl font-bold">{stats.toShip}</p>
          <p
            className={`mt-1 text-xs ${
              stats.toShip > 0 ? "text-white/60" : "text-gray-400"
            }`}
          >
            {stats.toShip > 0
              ? "Paid orders waiting for you"
              : "Nothing waiting right now"}
          </p>
        </Link>
      </section>

      {/* SALES GRAPH */}
      <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Sales</h2>

            <p className="mt-1 text-sm text-gray-500">
              Money paid by customers, by{" "}
              {range === "30d" ? "day" : "month"}.
            </p>
          </div>

          <div className="flex gap-2">
            {[
              { key: "30d", label: "Last 30 days" },
              { key: "12m", label: "Last 12 months" },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setRange(option.key as "30d" | "12m")}
                className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                  range === option.key
                    ? "border-black bg-black text-white"
                    : "border-gray-200 hover:border-black"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <SalesChart points={range === "30d" ? stats.days : stats.months} />
        </div>

        {orders.length >= ORDER_LIMIT && (
          <p className="mt-4 text-xs text-gray-400">
            Showing your latest {ORDER_LIMIT.toLocaleString("en-NG")} paid
            orders.
          </p>
        )}
      </section>

      {/* MONTHLY RECAP */}
      <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Monthly recap
            </p>

            <h2 className="mt-2 text-2xl font-semibold">{stats.monthName}</h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-gray-600">
              {recapLine}
            </p>
          </div>

          <button
            type="button"
            onClick={downloadReport}
            disabled={stats.thisMonth.length === 0}
            className="rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold transition hover:border-black disabled:cursor-not-allowed disabled:opacity-40"
          >
            Download this month&apos;s orders
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-gray-50 p-5">
            <p className="text-xs text-gray-500">Sales</p>
            <p className="mt-2 text-xl font-bold">
              {formatCurrency(stats.monthSales, "NGN")}
            </p>
            <p className="mt-1">
              <Change current={stats.monthSales} previous={stats.prevSales} />
            </p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-5">
            <p className="text-xs text-gray-500">Orders</p>
            <p className="mt-2 text-xl font-bold">{stats.monthOrders}</p>
            <p className="mt-1">
              <Change current={stats.monthOrders} previous={stats.prevOrders} />
            </p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-5">
            <p className="text-xs text-gray-500">Average order</p>
            <p className="mt-2 text-xl font-bold">
              {formatCurrency(stats.average, "NGN")}
            </p>
            <p className="mt-1">
              <Change current={stats.average} previous={stats.prevAverage} />
            </p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-5">
            <p className="text-xs text-gray-500">Items sold</p>
            <p className="mt-2 text-xl font-bold">
              {itemsSold === null ? "..." : itemsSold}
            </p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-5">
            <p className="text-xs text-gray-500">Customers</p>
            <p className="mt-2 text-xl font-bold">{stats.customers}</p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-5">
            <p className="text-xs text-gray-500">Repeat customers</p>
            <p className="mt-2 text-xl font-bold">{stats.repeatCustomers}</p>
            <p className="mt-1 text-xs text-gray-400">Bought more than once</p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-5 sm:col-span-2">
            <p className="text-xs text-gray-500">Best day</p>
            <p className="mt-2 text-xl font-bold">
              {stats.bestDay
                ? `${stats.bestDay.date.toLocaleDateString("en-NG", {
                    weekday: "long",
                    day: "numeric",
                    month: "short",
                  })} · ${formatCurrency(stats.bestDay.value, "NGN")}`
                : "No sales yet"}
            </p>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-semibold">Top products this month</h3>

          {topProducts === null ? (
            <p className="mt-3 text-sm text-gray-500">Loading...</p>
          ) : topProducts.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">
              No products sold yet this month.
            </p>
          ) : (
            <ol className="mt-4 divide-y divide-gray-100">
              {topProducts.map((product, index) => (
                <li
                  key={product.name}
                  className="flex items-center justify-between gap-4 py-3 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black text-xs font-semibold text-white">
                      {index + 1}
                    </span>

                    <span className="truncate font-medium">{product.name}</span>
                  </span>

                  <span className="shrink-0 text-right text-gray-500">
                    {plural(product.units, "sold")} ·{" "}
                    {formatCurrency(product.revenue, "NGN")}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      {/* STOCK WATCH */}
      {(outOfStock.length > 0 || lowStock.length > 0) && (
        <section className="mt-6 rounded-3xl border border-red-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-400">
            Stock watch
          </p>

          <div className="mt-3 space-y-2 text-sm">
            {outOfStock.length > 0 && (
              <p>
                <span className="font-semibold text-red-600">
                  Out of stock:
                </span>{" "}
                {outOfStock.map((product) => product.name).join(", ")}
              </p>
            )}

            {lowStock.length > 0 && (
              <p>
                <span className="font-semibold text-yellow-700">
                  Running low:
                </span>{" "}
                {lowStock
                  .map(
                    (product) =>
                      `${product.name} (${product.stock_quantity} left)`
                  )
                  .join(", ")}
              </p>
            )}
          </div>

          <Link
            href="/seller/products"
            className="mt-4 inline-flex text-sm font-semibold underline underline-offset-4"
          >
            Update stock
          </Link>
        </section>
      )}

      {/* RECENT ORDERS */}
      <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm md:p-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Recent paid orders</h2>

          <Link
            href="/seller/orders"
            className="text-sm font-medium text-gray-500 hover:text-black"
          >
            View all →
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <p className="mt-6 text-sm text-gray-500">
            No paid orders yet. Share your store link to get your first sale.
          </p>
        ) : (
          <div className="mt-5 divide-y divide-gray-100">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/seller/orders/${order.id}`}
                className="flex flex-col gap-2 py-4 transition hover:opacity-70 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold">
                    #{order.id.slice(0, 8).toUpperCase()}
                    {order.customer_name ? ` · ${order.customer_name}` : ""}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    {formatDate(order.created_at)}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                    {statusLabel(order.status)}
                  </span>

                  <span className="text-sm font-semibold">
                    {formatCurrency(Number(order.total), "NGN")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* QUICK ACTIONS */}
      <section className="mt-8">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Quick actions</h2>

          <p className="mt-1 text-sm text-gray-500">
            Common things you can do with your store.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Link
            href="/seller/products"
            className="rounded-3xl bg-black p-6 text-white transition hover:-translate-y-0.5"
          >
            <p className="text-sm font-semibold">Products</p>

            <p className="mt-2 text-sm leading-6 text-white/60">
              Add and edit products, import from a spreadsheet, update stock.
            </p>

            <p className="mt-6 text-sm font-semibold">Manage products →</p>
          </Link>

          <Link
            href="/seller/orders"
            className="rounded-3xl bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-semibold">Orders</p>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              View customer orders, ship them and keep customers updated.
            </p>

            <p className="mt-6 text-sm font-semibold">View orders →</p>
          </Link>

          <Link
            href="/seller/delivery"
            className="rounded-3xl bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-semibold">Delivery</p>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Set your delivery fees and tell customers how long it takes.
            </p>

            <p className="mt-6 text-sm font-semibold">Delivery settings →</p>
          </Link>

          <Link
            href="/seller/verification"
            className="rounded-3xl bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-semibold">Verification</p>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Get the Verified by Spurax badge and build customer trust.
            </p>

            <p className="mt-6 text-sm font-semibold">Get verified →</p>
          </Link>

          <Link
            href="/seller/payments"
            className="rounded-3xl bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-semibold">Payments</p>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Connect or change the bank account where you receive your sales.
            </p>

            <p className="mt-6 text-sm font-semibold">Payment settings →</p>
          </Link>

          <Link
            href="/seller/store"
            className="rounded-3xl bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-semibold">Store settings</p>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Manage your logo, banner, description, contact details and links.
            </p>

            <p className="mt-6 text-sm font-semibold">Manage store →</p>
          </Link>
        </div>
      </section>
    </main>
  );
}