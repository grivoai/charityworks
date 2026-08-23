import type { Metadata } from "next";
import { getPage, getSite } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { ContactForm } from "@/components/ContactForm";
import { ContactChannels } from "@/components/ContactChannels";
import { Icon } from "@/components/Icon";
import { getInterestLookup } from "@/lib/interests";
import { editable } from "@/lib/editable";
import { BreadcrumbJsonLd } from "@/components/JsonLd";

export function generateMetadata(): Promise<Metadata> {
  return buildMetadata("contact");
}

export default async function ContactRoute() {
  const [page, site] = await Promise.all([getPage("contact"), getSite()]);

  return (
    <>
      <BreadcrumbJsonLd title="Contact" path={page.seo.path} />

      <section
        className="pad contact contact-page"
        aria-labelledby="contact-heading"
      >
        <div className="wrap">
          <div>
            <span className="eyebrow reveal" {...editable("intro.eyebrow")}>
              {page.intro.eyebrow}
            </span>
            <h1
              className="section-title reveal"
              id="contact-heading"
              {...editable("heading")}
            >
              {page.heading}
            </h1>
            <p
              className="section-lede reveal"
              style={{ color: "rgba(255,255,255,0.8)" }}
              {...editable("intro.lede")}
            >
              {page.intro.lede}
            </p>

            <h2 className="sr-only">How to reach us</h2>
            <ContactChannels channels={site.contact.channels} />

            <p className="mobile-note reveal d3">
              <span className="inline-ico" aria-hidden="true"><Icon name="smartphone" /></span>{" "}
              {/* The ` — ` stays one text node, exactly as it was. Splitting it
                  reshapes the glyphs either side and the paragraph rasterises a
                  few pixels differently — invisible, but it is not nothing, and
                  keeping it whole costs only a long line. */}
              <strong {...editable("mobileNote.heading")}>{page.mobileNote.heading}</strong> — <span {...editable("mobileNote.body")}>{page.mobileNote.body}</span>
            </p>
          </div>

          {/* The lookup is passed from the server so `?interest=` can be turned
              into a label without a request, which is what lets this page stay
              statically rendered. */}
          <ContactForm
            form={page.form}
            booking={site.booking}
            source="contact-page"
            interests={await getInterestLookup()}
            path="form"
          />
        </div>
      </section>
    </>
  );
}
