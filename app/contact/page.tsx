import type { Metadata } from "next";
import { getPage } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { ContactForm } from "@/components/ContactForm";
import { getInterestLookup } from "@/lib/interests";
import { BreadcrumbJsonLd } from "@/components/JsonLd";
import { site } from "@/content/site";

export const metadata: Metadata = buildMetadata("contact");

export default function ContactRoute() {
  const page = getPage("contact");

  return (
    <>
      <BreadcrumbJsonLd title="Contact" path={page.seo.path} />

      <section
        className="pad contact contact-page"
        aria-labelledby="contact-heading"
      >
        <div className="wrap">
          <div>
            <span className="eyebrow reveal">{page.intro.eyebrow}</span>
            <h1 className="section-title reveal" id="contact-heading">
              {page.heading}
            </h1>
            <p
              className="section-lede reveal"
              style={{ color: "rgba(255,255,255,0.8)" }}
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
              <strong>{page.mobileNote.heading}</strong> — {page.mobileNote.body}
            </p>
          </div>

          {/* The lookup is passed from the server so `?interest=` can be turned
              into a label without a request, which is what lets this page stay
              statically rendered. */}
          <ContactForm
            form={page.form}
            source="contact-page"
            interests={getInterestLookup()}
          />
        </div>
      </section>
    </>
  );
}
