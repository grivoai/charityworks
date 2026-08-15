import type { LucideIcon } from "lucide-react";
import {
  Ban, BellRing, Circle, Compass, Disc3, EyeOff, Flame, Gavel, Gem, Guitar,
  HandCoins, Handshake, Laptop, LayoutGrid, Link2, Mail, MapPin, Mic, Package,
  Palmtree, PartyPopper, Phone, Plane, Receipt, Repeat, ShieldCheck,
  ShoppingBag, Smartphone, Sparkles, Star, Tag, Ticket, TicketCheck,
  TrendingUp, Trophy, Undo2, Zap,
} from "lucide-react";

/**
 * A curated line-icon set, rendered from a content slug.
 *
 * Fields store a slug ("guitar", "shield-check"). For a gentle migration this
 * also accepts the emoji a field used to hold, so a record not yet migrated — or
 * one an editor pastes an emoji into — still resolves to the intended icon
 * rather than printing a raw glyph that renders differently on every device.
 * Anything unrecognised falls back to a neutral mark instead of breaking a row.
 *
 * Server-rendered SVG: no client JavaScript, and every icon inherits
 * `currentColor`, so the surrounding section's colour drives it.
 */
const BY_SLUG: Record<string, LucideIcon> = {
  "palm-tree": Palmtree,
  plane: Plane,
  guitar: Guitar,
  trophy: Trophy,
  gem: Gem,
  handbag: ShoppingBag,
  mic: Mic,
  disc: Disc3,
  phone: Phone,
  mail: Mail,
  "map-pin": MapPin,
  flame: Flame,
  compass: Compass,
  "trending-up": TrendingUp,
  handshake: Handshake,
  star: Star,
  sparkles: Sparkles,
  "shield-check": ShieldCheck,
  package: Package,
  "bell-ring": BellRing,
  repeat: Repeat,
  zap: Zap,
  ban: Ban,
  tag: Tag,
  "hand-coins": HandCoins,
  undo: Undo2,
  receipt: Receipt,
  "eye-off": EyeOff,
  gavel: Gavel,
  laptop: Laptop,
  smartphone: Smartphone,
  link: Link2,
  "layout-grid": LayoutGrid,
  "party-popper": PartyPopper,
  ticket: Ticket,
  "ticket-check": TicketCheck,
};

/** Legacy emoji → slug, so un-migrated content still resolves. */
const BY_EMOJI: Record<string, string> = {
  "🌴": "palm-tree", "✈️": "plane", "🎸": "guitar", "🏆": "trophy", "💎": "gem",
  "👜": "handbag", "🎤": "mic", "🥇": "disc",
  "📞": "phone", "✉️": "mail", "📍": "map-pin",
  "🔥": "flame", "🧭": "compass", "📈": "trending-up", "🤝": "handshake",
  "🤩": "star", "✨": "sparkles", "🛡️": "shield-check", "📦": "package",
  "🛎️": "bell-ring", "🔁": "repeat", "⚡": "zap", "🚫": "ban", "🏷️": "tag",
  "💰": "hand-coins", "↩️": "undo", "🧾": "receipt", "🤫": "eye-off",
  "🔨": "gavel", "💻": "laptop", "📱": "smartphone", "🔗": "link", "🗂️": "layout-grid",
  "🎉": "party-popper", "🎟️": "ticket", "🎫": "ticket-check",
};

/** The set of legal slugs, exported for the content migration to validate against. */
export const ICON_SLUGS = Object.keys(BY_SLUG);

export function Icon({
  name,
  className = "cw-icon",
  strokeWidth = 1.75,
}: {
  name: string;
  className?: string;
  strokeWidth?: number;
}) {
  const slug = BY_SLUG[name] ? name : BY_EMOJI[name];
  const Glyph = (slug ? BY_SLUG[slug] : undefined) ?? Circle;
  return (
    <Glyph
      className={className}
      strokeWidth={strokeWidth}
      aria-hidden={true}
      focusable={false}
    />
  );
}
