import type { DonorPerk, Step } from "../types";

/** The three-step process. Shared by Home and Auction Info. */
export const steps: Step[] = [
  {
    id: "step-choose",
    number: "1",
    icon: "layout-grid",
    title: "Choose Your Items",
    body: "Browse dozens of consignment packages tailored to your crowd. Luxury travel, experiences, memorabilia and more.",
  },
  {
    id: "step-run",
    number: "2",
    icon: "party-popper",
    title: "Run Your Event",
    body: "Silent auction, live auction, or virtual. We support all formats and can deliver items last minute.",
  },
  {
    id: "step-pay",
    number: "3",
    icon: "hand-coins",
    title: "Pay Only What Sells",
    body: "Return anything unsold. You owe nothing. Keep every dollar above our set price.",
  },
];

/** Donor incentive (Las Vegas package) rows. */
export const donorPerks: DonorPerk[] = [
  {
    id: "perk-ticket",
    emoji: "ticket",
    action: "Buy a Ticket",
    reward: "Free Vacation Package",
    note: "Every attendee qualifies.",
  },
  {
    id: "perk-bid",
    emoji: "gavel",
    action: "Place a Bid",
    reward: "Free Vacation Package",
    note: "Bidding earns a reward.",
  },
  {
    id: "perk-raffle",
    emoji: "ticket-check",
    action: "Buy $100 in Raffle",
    reward: "Free Vacation Package",
    note: "Raffle buyers cash in.",
  },
  {
    id: "perk-pledge",
    emoji: "handshake",
    action: "Make a Pledge",
    reward: "Free Vacation Package",
    note: "Pledges get thanked.",
  },
];
