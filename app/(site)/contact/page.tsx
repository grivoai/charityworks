import type { Metadata } from "next";
import { getPage, getSite } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { ContactForm } from "@/components/ContactForm";
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
            <div className="contact-info">
              {site.contact.channels.map((channel, index) => (
                <div
                  key={channel.id}
                  className={`ci-row reveal d${index + 1}`}
                >
                  <div className="ci-ico" aria-hidden="true">
                    {channel.icon}
                  </div>
                  <div>
                    <div className="lbl">{channel.label}</div>
                    {channel.href ? (
                      <a href={channel.href} className="val">
                        {channel.value}
                      </a>
                    ) : (
                      <div className="val">{channel.value}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <p className="mobile-note reveal d3">
              <span aria-hidden="true">📱</span>{" "}
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
