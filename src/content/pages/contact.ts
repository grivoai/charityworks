import type { ContactPage } from "../types";

export const contactPage: ContactPage = {
  slug: "contact",
  heading: "Get Your Free Fundraising Plan",

  seo: {
    title: "Get a Free Fundraising Plan for Your Nonprofit | CharityWorks",
    description:
      "Tell us about your gala or fundraiser and we'll build a free, risk-free auction plan. Serving nonprofits in all 50 states. Call (925) 250-6968.",
    targetTerms: [
      "nonprofit fundraising consultant",
      "free fundraising plan",
      "charity auction consultant",
    ],
    path: "/contact",
  },

  intro: {
    eyebrow: "Get Your Free Fundraising Plan",
    title: "Ready to Supercharge Your Next Fundraiser?",
    lede: "Tell us about your event and we'll build a risk-free plan to help you raise more than ever.",
  },

  /**
   * Field definitions drive the rendered form. Phase 2's form builder writes to
   * this same shape, so the renderer will not need to change when the fields
   * become editable records rather than a hand-authored array.
   */
  form: {
    fields: [
      {
        id: "field-name",
        name: "name",
        label: "Name",
        type: "text",
        placeholder: "Jane Doe",
        required: true,
        width: "half",
      },
      {
        id: "field-org",
        name: "org",
        label: "Organization",
        type: "text",
        placeholder: "Your Nonprofit",
        required: true,
        width: "half",
      },
      {
        id: "field-email",
        name: "email",
        label: "Email",
        type: "email",
        placeholder: "you@org.org",
        required: true,
        width: "half",
      },
      {
        id: "field-phone",
        name: "phone",
        label: "Phone",
        type: "tel",
        placeholder: "(555) 555-5555",
        required: false,
        width: "half",
      },
      {
        id: "field-date",
        name: "date",
        label: "Event Date",
        type: "date",
        required: false,
        width: "full",
      },
      {
        id: "field-message",
        name: "message",
        label: "Message",
        type: "textarea",
        placeholder: "Tell us about your event...",
        required: false,
        width: "full",
      },
    ],
    submitLabel: "Get My Free Plan",
    // Points at the booking widget rendered directly beneath it rather than at
    // a wait. Promising a callback next to a live calendar invites people to
    // do nothing, which is the slower path for them and for us.
    successMessage:
      "✓ Got it — your details are with us. Now pick a time below and talk to Ira directly.",
    errorMessage: "Something went wrong. Please call (925) 250-6968 instead.",
  },

  mobileNote: {
    heading: "Ask us about our Mobile Bidding Platform",
    body: "Let guests bid right from their phones for higher engagement and bigger totals.",
  },
};
