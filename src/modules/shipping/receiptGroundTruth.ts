export interface AuditedReceiptCase {
  id: string;
  objeto: string;
  cidadeUf: string;
  cep: string;
  serviceId: "correios_sedex" | "correios_pac";
  serviceLabel: string;
  dimensoesCm: [number, number, number]; // [H, W, D]
  pesoRealKg: number;
  valorDeclaradoReais: number;
  comprovanteBaseReais: number;
  comprovanteSeguroReais: number;
  comprovanteTotalReais: number;
}

export const CORREIOS_CONTRACT_METADATA = {
  contractNumber: "9912722993",
  postcardNumber: "0079659128",
  agency: "AC TABOAO DA SERRA - SE/SPM (00024489)",
  originCep: "06754-000",
  cnpj: "11040282000177",
  sedexServiceCode: "03220",
  pacServiceCode: "03298",
  auditedReceiptsCount: 8,
  auditedAveragePrecision: "99.93%",
  toleranceMinPrecision: "95.00%",
};

export const AUDITED_RECEIPT_CASES: AuditedReceiptCase[] = [
  {
    id: "COMPROVANTE 1",
    objeto: "AD912900624BR",
    cidadeUf: "Paulínia - SP",
    cep: "13140-610",
    serviceId: "correios_sedex",
    serviceLabel: "SEDEX CONTRATO AG",
    dimensoesCm: [68, 65, 23],
    pesoRealKg: 16,
    valorDeclaradoReais: 1240.0,
    comprovanteBaseReais: 45.89,
    comprovanteSeguroReais: 12.14,
    comprovanteTotalReais: 58.03,
  },
  {
    id: "COMPROVANTE 2 - OBJETO 1",
    objeto: "AD883725560BR",
    cidadeUf: "Cidreira - RS",
    cep: "95595-000",
    serviceId: "correios_sedex",
    serviceLabel: "SEDEX CONTRATO AG",
    dimensoesCm: [90, 45, 20],
    pesoRealKg: 16,
    valorDeclaradoReais: 1140.0,
    comprovanteBaseReais: 208.2,
    comprovanteSeguroReais: 11.22,
    comprovanteTotalReais: 219.42,
  },
  {
    id: "COMPROVANTE 2 - OBJETO 2",
    objeto: "AD883737464BR",
    cidadeUf: "Cajamar - SP",
    cep: "07792-820",
    serviceId: "correios_sedex",
    serviceLabel: "SEDEX CONTRATO AG",
    dimensoesCm: [68, 65, 23],
    pesoRealKg: 22,
    valorDeclaradoReais: 7890.0,
    comprovanteBaseReais: 45.89,
    comprovanteSeguroReais: 77.74,
    comprovanteTotalReais: 123.63,
  },
  {
    id: "COMPROVANTE 2 - OBJETO 3",
    objeto: "AD883788383BR",
    cidadeUf: "Guarulhos - SP",
    cep: "07084-220",
    serviceId: "correios_sedex",
    serviceLabel: "SEDEX CONTRATO AG",
    dimensoesCm: [90, 45, 20],
    pesoRealKg: 16,
    valorDeclaradoReais: 990.0,
    comprovanteBaseReais: 47.96,
    comprovanteSeguroReais: 9.64,
    comprovanteTotalReais: 57.6,
  },
  {
    id: "COMPROVANTE 3",
    objeto: "AD869362607BR",
    cidadeUf: "Santana de Parnaíba - SP",
    cep: "06544-300",
    serviceId: "correios_sedex",
    serviceLabel: "SEDEX CONTRATO AG",
    dimensoesCm: [96, 45, 42],
    pesoRealKg: 26,
    valorDeclaradoReais: 1790.0,
    comprovanteBaseReais: 99.64,
    comprovanteSeguroReais: 17.64,
    comprovanteTotalReais: 117.28,
  },
  {
    id: "COMPROVANTE 4",
    objeto: "AP480970991BR",
    cidadeUf: "Caldas Novas - GO",
    cep: "75680-013",
    serviceId: "correios_pac",
    serviceLabel: "PAC CONTRATO AG",
    dimensoesCm: [90, 45, 20],
    pesoRealKg: 16,
    valorDeclaradoReais: 1520.0,
    comprovanteBaseReais: 130.3,
    comprovanteSeguroReais: 14.94,
    comprovanteTotalReais: 145.24,
  },
  {
    id: "COMPROVANTE 5 - OBJETO 1",
    objeto: "AP562222213BR",
    cidadeUf: "Natal - RN",
    cep: "59075-700",
    serviceId: "correios_pac",
    serviceLabel: "PAC CONTRATO AG",
    dimensoesCm: [90, 45, 41],
    pesoRealKg: 30,
    valorDeclaradoReais: 1980.0,
    comprovanteBaseReais: 260.39,
    comprovanteSeguroReais: 19.54,
    comprovanteTotalReais: 279.93,
  },
  {
    id: "COMPROVANTE 5 - OBJETO 2",
    objeto: "AD963834575BR",
    cidadeUf: "Guarapuava - PR",
    cep: "85035-010",
    serviceId: "correios_sedex",
    serviceLabel: "SEDEX CONTRATO AG",
    dimensoesCm: [90, 45, 20],
    pesoRealKg: 16,
    valorDeclaradoReais: 1450.0,
    comprovanteBaseReais: 176.69,
    comprovanteSeguroReais: 14.24,
    comprovanteTotalReais: 190.93,
  },
];
