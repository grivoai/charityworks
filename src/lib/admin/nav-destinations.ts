import "server-only";

import type { FieldNode, ObjectNode } from "@/lib/admin/field-node";
import { BUILT_IN_PAGES } from "@/lib/reserved-paths";
import { getListedCustomPages } from "@/lib/custom-pages";

/**
 * Where a navigation link is allowed to point.
 *
 * The set is not knowable when the schema is written — it grows and shrinks as
 * the client publishes and unpublishes their own pages — so it cannot be a Zod
 * enum. It is resolved per request instead, injected into the field tree for
 * the editor to draw as a dropdown, and re-derived on save to check what came
 * back. The editor half is convenience; the save half is the rule.
 *
 * This is what lifted the `nav` fixed-length lock. Before custom pages there
 * was nowhere new to point, so the only link anyone could add was a duplicate
 * of one already there, and the honest answer was a closed list. Now there is.
 */

export interface NavDestination {
  href: string;
  label: string;
}

/**
 * Every address a nav link may use, in the order they should be offered.
 *
 * Only LISTED custom pages appear. An unlisted page in the menu would be a
 * contradiction in terms — it is the menu that "unlisted" means being absent
 * from — and offering one here would be the easiest way to undo the setting by
 * accident.
 */
export async function getNavDestinations(): Promise<NavDestination[]> {
  const builtIn: NavDestination[] = [
    { href: "/", label: "Home" },
    ...BUILT_IN_PAGES.map((slug) => ({
      href: `/${slug}`,
      label: `/${slug}`,
    })),
  ];

  const custom = (await getListedCustomPages()).map((page) => ({
    href: `/${page.slug}`,
    label: `/${page.slug} — ${page.title}`,
  }));

  return [...builtIn, ...custom];
}

/**
 * Replaces `nav[].href` in a built field tree with a picker over `destinations`.
 *
 * A patch rather than a parameter to `buildFieldTree`, deliberately. That
 * function turns a Zod schema into a tree and is used by five editors; giving
 * it a "and also, sometimes, a list of URLs" argument would put a special case
 * for one field of one document into the shared path. Doing it here keeps the
 * shared builder honest and keeps this rule where it can be read.
 *
 * Returns a new tree; the input is not mutated, because the caller's copy may
 * be shared with a cached render.
 */
export function withNavDestinations(
  tree: ObjectNode,
  destinations: NavDestination[]
): ObjectNode {
  return {
    ...tree,
    fields: tree.fields.map((field) => {
      if (field.key !== "nav") return field;

      const nav = field.node;
      if (nav.kind !== "array" || nav.element.kind !== "object") return field;

      const element: FieldNode = {
        ...nav.element,
        fields: nav.element.fields.map((inner) => {
          if (inner.key !== "href") return inner;
          return {
            key: inner.key,
            node: {
              ...inner.node,
              kind: "enum" as const,
              values: destinations.map((d) => d.href),
              // The reason lives on the field rather than in a help block so it
              // travels with the input wherever the form puts it.
              description:
                "Which page this link opens. Only pages that exist can be " +
                "chosen — a link typed by hand would point at a page the site " +
                "does not have.",
            },
          };
        }),
      };

      return {
        key: field.key,
        node: { ...nav, element, template: nav.template },
      };
    }),
  };
}
