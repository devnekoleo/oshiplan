import { z } from "zod";

export const ItineraryItemSchema = z.object({
  time: z.string().regex(/^\d{2}:\d{2}$/, "HH:MM形式で入力してください"),
  action: z.string().min(1).max(200),
  cost: z.number().int().nonnegative().nullable(),
});

export const AffiliateLinksSchema = z
  .object({
    rakuten: z.string().url().nullable().optional(),
    jalan: z.string().url().nullable().optional(),
  })
  .partial();

export const AccommodationSchema = z.object({
  name: z.string().min(1).max(100),
  area: z.string().max(50).nullable(),
  price_approx: z.number().int().nonnegative().nullable(),
  affiliate_links: AffiliateLinksSchema.nullable(),
});

export const TransitInfoSchema = z.object({
  type: z.enum(["shinkansen", "airplane", "bus", "local", "other"]),
  name: z.string(),
  cost: z.number().int().nonnegative(),
  duration_min: z.number().int().positive(),
  booking_url: z.string().url().nullable(),
});

export const GoodsLinkSchema = z.object({
  name: z.string().max(100),
  amazon_url: z.string().url().nullable(),
});

export const PlanJsonSchema = z.object({
  summary: z.string().min(1).max(200),
  estimated_cost: z.number().int().nonnegative(),
  itinerary: z.array(ItineraryItemSchema).min(1).max(20),
  accommodation: AccommodationSchema.nullable(),
  transit: z.object({
    outbound: TransitInfoSchema.nullable(),
    return: TransitInfoSchema.nullable(),
  }),
  merch_line_advice: z.string().max(500).nullable(),
  goods_links: z.array(GoodsLinkSchema).max(5),
  tips: z.array(z.string().max(200)).max(10),
});

export type PlanJsonValidated = z.infer<typeof PlanJsonSchema>;
