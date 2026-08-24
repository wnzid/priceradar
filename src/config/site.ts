export const siteConfig={
  siteName:"PriceRadar",
  operatorName:"PriceRadar",
  contactEmail:import.meta.env.VITE_PUBLIC_CONTACT_EMAIL?.trim()||undefined,
  legalLastUpdated:"24 August 2026",
  privacyLastUpdated:"24 August 2026",
} as const;
