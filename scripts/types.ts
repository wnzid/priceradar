export type Store = "rimi" | "maxima";
export type UnitType = "kg" | "l" | "piece";
export type PromotionType = "SALE" | "LOYALTY" | "CAMPAIGN";
export type SourcePlatform = "rimi" | "maxima" | "barbora";
export type SalesChannel = "physical" | "online";
export type DisplayNameSource = "CANONICAL" | "AUTO" | "UNTRANSLATED";
export interface RawOffer { externalId?: string; name: string; description?: string; brand?: string; salePrice?: number; loyaltyPrice?: number; regularPrice?: number; discountPercent?: number; quantity?: number; unit?: string; pricePerUnit?: number; pricePerUnitType?: UnitType; validFrom?: string; validUntil?: string; imageUrl?: string; sourceUrl: string; category?: string; sourceCategory?: string; promotionType?: PromotionType; sourceType?: "web" | "structured" | "leaflet"; sourcePlatform?: SourcePlatform; channel?: SalesChannel; campaignId?: string; publicationId?: string; leafletTitle?:string; leafletSourceUrl?:string; promotionSource?:"leaflet"|"eshop"; promotionActive?:boolean; promotionConditions?:string; onlineAvailable?:boolean|null; physicalStoreAvailability?:"unknown"; ecommercePrice?:number; leafletImageUrl?:string; page?: number; confidence?: "HIGH" | "MEDIUM" }
export interface RawOffer { ingredients?:string; meatType?:string }
export interface StoreData { store: Store; collectedAt: string; source: string; offers: RawOffer[] }
export interface DealOffer extends RawOffer { store: Store; sourceName: string; displayName:string; displayNameSource:DisplayNameSource; canonicalProductId?:string; intelligence?:import("./deals/types.js").DealIntelligence }
export interface Deal { id: string; name: string; category: string; subcategory?: string; aliases: string[]; primaryImageUrl?:string; offers: DealOffer[] }
