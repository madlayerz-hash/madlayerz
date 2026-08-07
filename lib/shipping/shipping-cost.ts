export type Region = 'metropolitana' | 'valparaiso' | 'biobio' | 'araucania' | 'los-lagos' | 'otra';
export type DeliveryMethod = 'domicilio' | 'retiro';

const REGION_COSTS_CLP: Record<Region, number> = {
  metropolitana: 3500,
  valparaiso: 4500,
  biobio: 5500,
  araucania: 5500,
  'los-lagos': 6500,
  otra: 7500,
};

export function calculateShippingCost(method: DeliveryMethod, region?: Region): number {
  if (method === 'retiro') return 0;
  if (!region) throw new Error('region is required for domicilio delivery');
  return REGION_COSTS_CLP[region];
}
