import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import {
  getStoreFeatureEnabled,
  listStoreProductsAll,
  listStorePurchasesForAdmin,
  getStoreSalesStats,
} from "@/lib/db";
import { StoreAdminClient } from "./StoreAdminClient";

export default async function StoreDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const enabled = await getStoreFeatureEnabled();
  const [products, purchases, stats] = await Promise.all([
    listStoreProductsAll().catch(() => []),
    listStorePurchasesForAdmin().catch(() => []),
    getStoreSalesStats().catch(() => ({ purchasesCount: 0, buyersCount: 0, soldProductsCount: 0, revenue: 0 })),
  ]);

  return (
    <StoreAdminClient
      initialEnabled={enabled}
      initialProducts={products}
      initialPurchases={purchases}
      initialStats={stats}
    />
  );
}
