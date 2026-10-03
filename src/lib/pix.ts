/**
 * Gerador de Payload Pix Estático (Padrão EMV Banco Central do Brasil)
 */

function formatField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

function calculateCRC16(payload: string): string {
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export interface PixPayloadOptions {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  txId: string;
  amountCents: number;
}

export function generatePixPayload(options: PixPayloadOptions): string {
  const { pixKey, merchantName, merchantCity, txId, amountCents } = options;

  const formattedAmount = (amountCents / 100).toFixed(2);
  const cleanTxId = txId.replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";
  const cleanMerchant = merchantName.slice(0, 25);
  const cleanCity = merchantCity.slice(0, 15);

  // Merchant Account Information (Tag 26)
  const gui = formatField("00", "br.gov.bcb.pix");
  const key = formatField("01", pixKey);
  const merchantAccountInfo = formatField("26", `${gui}${key}`);

  // Additional Data Field Template (Tag 62)
  const txField = formatField("05", cleanTxId);
  const additionalData = formatField("62", txField);

  // Montagem preliminar sem CRC
  const rawPayload =
    formatField("00", "01") + // Payload Format Indicator
    formatField("01", "12") + // Point of Initiation Method: 12 (Dynamic/Static QR)
    merchantAccountInfo +
    formatField("52", "0000") + // Merchant Category Code
    formatField("53", "986") + // Transaction Currency: 986 (BRL)
    formatField("54", formattedAmount) + // Transaction Amount
    formatField("58", "BR") + // Country Code
    formatField("59", cleanMerchant) + // Merchant Name
    formatField("60", cleanCity) + // Merchant City
    additionalData +
    "6304"; // Tag de CRC16 esperando os 4 dígitos

  const crc = calculateCRC16(rawPayload);
  return `${rawPayload}${crc}`;
}
