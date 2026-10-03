export const APPWRITE_CONFIG = {
  endpoint:
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
    "https://appwrite-inwbueezn2gkpm4tqwvzkswy.179.199.142.157.sslip.io/v1",
  projectId:
    process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "chatboot-production",
  databaseId:
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "totem_db",
  apiKey:
    process.env.APPWRITE_API_KEY ||
    "standard_bc50daa650a82f0d19717cbbc3b277af8c84ee084ab50232baf2b21cfaaabc4fa80ca0af9669163cd644c8676097eefbe001d9cd77a01b60e9b598222ab8117f341729ad3e5330e06af8c63da6e79e8cc3affa6e54cb87056f542c01f934bf21c37b43d1ddaaa5be0c7aff2f0ff2a060dc7d452ee763a2e22830b35da14db7b1",
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
  },
} as const;
