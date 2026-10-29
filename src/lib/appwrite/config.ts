export const APPWRITE_CONFIG = {
  endpoint:
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
    "https://appwrite-inwbueezn2gkpm4tqwvzkswy.179.199.142.157.sslip.io/v1",
  projectId:
    process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "chatboot-production",
  databaseId:
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "totem_db",
  apiKey: process.env.APPWRITE_API_KEY || "",
  collections: {
    cabinetModels: "cabinet_models",
    colors: "colors",
    monitors: "monitors",
    printers: "printers",
    barcodeReaders: "barcode_readers",
    compatibilityRules: "compatibility_rules",
    carts: "carts",
    cartItems: "cart_items",
    orders: "orders",
    orderItems: "order_items",
    payments: "payments",
    adsLeadsCarts: "ads_leads_carts",
    analyticsEvents: "analytics_events",
  },
} as const;
