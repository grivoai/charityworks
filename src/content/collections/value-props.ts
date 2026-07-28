import type { ValueProp } from "../types";

/** The "Why CharityWorks" grid. Phase 2: a `value_props` table. */
export const valueProps: ValueProp[] = [
  {
    id: "vp-wow",
    icon: "🤩",
    title: "WOW Factor",
    body: "Sports & celebrity memorabilia create buzz that drives up bidding.",
  },
  {
    id: "vp-consultation",
    icon: "🧭",
    title: "Event Consultation",
    body: "We've worked with thousands of nonprofits in all 50 states.",
  },
  {
    id: "vp-experiences",
    icon: "✨",
    title: "Priceless Experiences",
    body: "Items you can't ordinarily access — bidders pay whatever it takes.",
  },
  {
    id: "vp-only-what-sells",
    icon: "🛡️",
    title: "Only Buy What You Sell",
    body: "100% risk free, with guaranteed profit on every item sold.",
  },
  {
    id: "vp-catalog",
    icon: "📦",
    title: "1,000+ Items",
    body: "Wide variety for every audience and demographic.",
  },
  {
    id: "vp-concierge",
    icon: "🛎️",
    title: "Concierge Service",
    body: "In-house travel booking — you provide the winner's info, we handle the rest.",
  },
  {
    id: "vp-resell",
    icon: "🔁",
    title: "Sell Multiple Times",
    body: "Popular packages can be sold more than once.",
  },
  {
    id: "vp-last-minute",
    icon: "⚡",
    title: "Last Minute Ready",
    body: "We can deliver items with only hours notice.",
  },
  {
    id: "vp-no-hidden-costs",
    icon: "🚫",
    title: "No Hidden Costs",
    body: "Get items at 75% retail, start bidding at retail, and keep every dollar above that.",
  },
];

/** Pricing detail shown on the Auction Info page. */
export const pricingPoints: ValueProp[] = [
  {
    id: "price-75",
    icon: "🏷️",
    title: "Items at 75% of Retail",
    body: "Your nonprofit receives every consignment item at 75% of its retail value.",
  },
  {
    id: "price-start-retail",
    icon: "📈",
    title: "Bidding Opens at Retail",
    body: "Start the bidding at full retail price so there is margin built in from the first paddle.",
  },
  {
    id: "price-keep-overage",
    icon: "💰",
    title: "You Keep Every Dollar Above",
    body: "Everything raised above our set price stays with your organization.",
  },
  {
    id: "price-return",
    icon: "↩️",
    title: "Return What Doesn't Sell",
    body: "Unsold items go back to us at no cost. You are never invoiced for them.",
  },
  {
    id: "price-invoice-after",
    icon: "🧾",
    title: "Invoiced After the Event",
    body: "We bill you once the event is over, for sold items only. Nothing is due upfront.",
  },
  {
    id: "price-no-fees",
    icon: "🚫",
    title: "No Hidden Fees",
    body: "No setup costs, no listing fees, no minimum order.",
  },
];

/** Event formats supported, shown on the Auction Info page. */
export const eventFormats: ValueProp[] = [
  {
    id: "format-silent",
    icon: "🤫",
    title: "Silent Auction",
    body: "Ideal for a high volume of items and a room that likes to browse at its own pace.",
  },
  {
    id: "format-live",
    icon: "🔨",
    title: "Live Auction",
    body: "Builds excitement around your headline packages with a professional auctioneer driving the room.",
  },
  {
    id: "format-virtual",
    icon: "💻",
    title: "Virtual Event",
    body: "Reach supporters who cannot attend in person, with no venue or catering overhead.",
  },
  {
    id: "format-hybrid",
    icon: "🔗",
    title: "Hybrid",
    body: "Run a live room and an online bidding audience together to maximise your reach.",
  },
];
