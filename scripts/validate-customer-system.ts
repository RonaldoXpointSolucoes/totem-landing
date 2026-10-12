import {
  normalizePhone,
  formatPhone,
  loginOrCreateWithWhatsapp,
  loginOrCreateWithGoogle,
  findOrCreateCustomerFromCheckout,
  findCustomerByWhatsapp,
  findCustomerByEmail,
} from "../src/lib/customers/customerStore";
import { saveLocalOrder, getOrdersByCustomer } from "../src/lib/orders/orderStore";
import { encodeCustomerSession, decodeCustomerSession } from "../src/lib/customers/customerSession";
import { OrderDetails } from "../src/types/order";

console.log("=== INICIANDO AUDITORIA DO SISTEMA DE CLIENTES & DASHBOARD ===");

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

// 1. Teste de Normalização e Formatação de Telefone
console.log("\n--- TESTE 1: Telefones WhatsApp ---");
const raw1 = "+55 (11) 98888-7777";
const clean1 = normalizePhone(raw1);
assert(clean1 === "11988887777", `Normalizou ${raw1} para ${clean1}`);
const formatted1 = formatPhone("11988887777");
assert(formatted1 === "(11) 98888-7777", `Formatou 11988887777 para ${formatted1}`);

// 2. Teste de Login/Cadastro com WhatsApp
console.log("\n--- TESTE 2: Login com WhatsApp ---");
const custWhatsapp = loginOrCreateWithWhatsapp("11999998888", "Marcos Cliente");
assert(custWhatsapp.whatsapp === "11999998888", "Conta WhatsApp criada com sucesso");
assert(custWhatsapp.loginMethod === "whatsapp", "Método de login é whatsapp");
const foundWhatsapp = findCustomerByWhatsapp("11 99999-8888");
assert(foundWhatsapp?.id === custWhatsapp.id, "Localizou cliente por número formatado");

// 3. Teste de Login/Cadastro com Google
console.log("\n--- TESTE 3: Login com Google ---");
const custGoogle = loginOrCreateWithGoogle("cliente.teste@gmail.com", "Cliente Google Teste", "https://avatar.url");
assert(custGoogle.email === "cliente.teste@gmail.com", "Conta Google criada com sucesso");
assert(custGoogle.loginMethod === "google", "Método de login é google");
const foundGoogle = findCustomerByEmail("CLIENTE.TESTE@GMAIL.COM");
assert(foundGoogle?.id === custGoogle.id, "Localizou cliente Google com case-insensitive");

// 4. Teste de Auto-indexação no Checkout
console.log("\n--- TESTE 4: Auto-criação no Checkout ---");
const testRunSuffix = Date.now();
const testEmail = `ana.compradora.${testRunSuffix}@empresa.com.br`;
const testPhone = `11977${String(testRunSuffix).slice(-5)}`;
const testOrderNum = `TP-TEST-${String(testRunSuffix).slice(-4)}`;

const checkoutCustomer = findOrCreateCustomerFromCheckout(
  {
    name: "Ana Compradora",
    email: testEmail,
    whatsapp: testPhone,
    personType: "company",
    document: "12.345.678/0001-90",
  },
  {
    cep: "01310-100",
    street: "Av. Paulista",
    number: "1000",
    neighborhood: "Bela Vista",
    city: "São Paulo",
    state: "SP",
  },
  450300
);
assert(checkoutCustomer.name === "Ana Compradora", "Cliente criado a partir do checkout");
assert(checkoutCustomer.totalSpentCents === 450300, `Total investido computado: ${checkoutCustomer.totalSpentCents}`);
assert(checkoutCustomer.addresses.length > 0, "Endereço de entrega salvo no histórico do cliente");

// 5. Teste de Persistência e Consulta de Pedidos do Cliente
console.log("\n--- TESTE 5: Histórico de Pedidos ---");
const mockOrder: OrderDetails = {
  id: `order_test_${testRunSuffix}`,
  orderNumber: testOrderNum,
  createdAt: new Date().toISOString(),
  customer: {
    name: "Ana Compradora",
    email: testEmail,
    whatsapp: testPhone,
    personType: "company",
  },
  deliveryAddress: {
    cep: "01310-100",
    street: "Av. Paulista",
    number: "1000",
    neighborhood: "Bela Vista",
    city: "São Paulo",
    state: "SP",
  },
  items: [],
  subtotalCents: 400000,
  shippingCents: 50300,
  totalCents: 450300,
  status: "in_production",
  payment: {
    status: "paid",
    method: "pix",
    pixCode: "00020126580014br.gov.bcb.pix...",
    expiresAt: new Date().toISOString(),
  },
  manufacturingSheets: [],
};
saveLocalOrder(mockOrder);

const ordersFoundByEmail = getOrdersByCustomer(testEmail);
assert(ordersFoundByEmail.some((o) => o.orderNumber === testOrderNum), "Pedido localizado por e-mail do cliente");

const ordersFoundByPhone = getOrdersByCustomer(undefined, testPhone);
assert(ordersFoundByPhone.some((o) => o.orderNumber === testOrderNum), "Pedido localizado por telefone do cliente");

// 6. Teste de Sessão Segura do Cliente
console.log("\n--- TESTE 6: Sessão Segura ---");
const sessionPayload = {
  customerId: custGoogle.id,
  name: custGoogle.name,
  email: custGoogle.email,
  whatsapp: custGoogle.whatsapp,
  expiresAt: Date.now() + 100000,
};
const encoded = encodeCustomerSession(sessionPayload);
const decoded = decodeCustomerSession(encoded);
assert(decoded?.customerId === custGoogle.id, "Payload da sessão codificado e decodificado com integridade");
assert(decoded?.email === custGoogle.email, "E-mail conferido na sessão");

console.log(`\n========================================`);
console.log(`RESULTADO FINAL: ${passed} PASSOU, ${failed} FALHOU`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
