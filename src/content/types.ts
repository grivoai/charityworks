/**
 * Content model for the CharityWorks site.
 *
 * These used to be hand-written interfaces. They are now inferred from the Zod
 * schemas in `./schema.ts`, which became the single description of each shape
 * when content moved into the database — one definition that validates on
 * write, parses on read, and generates the admin's form fields, rather than a
 * schema and an interface that drift apart.
 *
 * This module is deliberately kept as the import surface. Every
 * `import type { ... } from "@/content/types"` in the codebase still resolves,
 * and because these are all `export type`, nothing here reaches the runtime
 * bundle.
 *
 * Field-level documentation lives in `./schema.ts`, next to each field's
 * validation and its admin help text.
 *
 * Rules that keep the content model honest — unchanged from Phase 1:
 *   1. No copy lives in a component. It all lives in content.
 *   2. Every repeated record has a stable `id`, never derived from an array index.
 *   3. Images are `ImageRef` objects, never bare strings, so an upload record slots in.
 */

export type {
  /* Primitives */
  PageSlug,
  ImageRef,
  SeoMeta,
  ButtonVariant,
  CtaRef,
  SectionHeader,
  Step,
  ValueProp,

  /* Catalog */
  ItemDetail,
  CategoryItem,
  CategoryGroup,
  AuctionItem,

  /* People and social proof */
  DonorPerk,
  Auctioneer,
  Partner,
  Testimonial,
  FaqItem,

  /* Site globals */
  NavLink,
  ContactChannel,
  FormField,
  SiteContent,

  /* Pages */
  HomePage,
  DonorSection,
  AuctionInfoPage,
  AuctionItemsPage,
  AuctioneersPage,
  FaqsPage,
  TestimonialsPage,
  ContactPage,
  AnyPage,
  PageMap,

  /* Auction planner */
  PlannerQuestionId,
  PlannerOption,
  PlannerQuestion,
  AuctionPlannerPage,
} from "./schema";
