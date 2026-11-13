/**
 * The wording on the two hidden voucher-program pages:
 *
 *   /travel_voucher                 — how the program works, and its FAQ
 *   /terms-and-conditions-voucher   — the program's terms and conditions
 *
 * Copied from the text Lauri sent (Nov 2026) for the old charityworks.net
 * pages of the same addresses. THESE ARE PROGRAM TERMS: every sentence is
 * Lauri's, word for word. The only changes are the ones approved at the time:
 * "ogranization" → "organization", "involve" → "involved", "Sharelife" →
 * "ShareLife", stray double bullets and spaces before colons/commas removed,
 * the deposit FAQ's answer sentence moved out of its question (it had been
 * pasted onto the end of it), and the orientation answer's last paragraph
 * kept inside that answer. Don't reword, shorten or tidy anything else here
 * without the client's sign-off.
 *
 * The old pages also had a couple of images; they could not be recovered and
 * these pages are text only.
 *
 * In the code, not the admin, for the same reason as guitar-prices.ts. Change
 * the wording here and redeploy.
 */

/** One question and its answer. */
export interface VoucherFaq {
  question: string;
  /** The answer's paragraphs, in order. */
  answer: string[];
  /** A list that follows the answer's paragraphs. */
  bullets?: string[];
}

/** The "Book a call" button at the foot of both pages. */
export const voucherBooking = {
  label: "Book a call",
  href: "https://calendly.com/iraklein82/new-meeting",
};

export const travelVoucher = {
  seo: {
    title: "Voucher Program: How It Works & FAQ",
    description:
      "How the CharityWorks free vacation voucher program works for your donors, with answers to common questions.",
  },
  heading: "Here's How the Program Works",
  lede: "This is not a timeshare",
  /** The how-it-works steps, one paragraph each, in order. */
  steps: [
    "Voucher is sent to your donor/registrant by your group as an electronic voucher with a link to register.",
    "They are invited to register immediately, but do not have to. Registration is FREE, and it immediately makes them eligible for the ShareLife Travel Discount program (Guaranteed travel savings), as well as the vacations in either Las Vegas or Orlando.",
    "They may begin using the ShareLife Travel program which gives them access to up to 70% off hotel stays immediately. No obligation…No commitment... A GIFT to your donors….",
    "When they are ready to book their first trip ( Vegas or Orlando ), they call in to engage.... and book their dates.",
    "They pick their first FREE destination, Las Vegas or Orlando.",
    "Upon confirmation of their dates, they pay a $100 deposit. This is only to insure that they DO show-up for their reserved dates.",
    "They will get a written email confirmation.",
    "After check-in at their hotel, they will be invited to a short orientation: (elective). The orientation shows them how to use their ShareLife membership to get the most travel savings. In Las Vegas they come to our office for the orientation and to pick up the dining card and bonus trip voucher. Currently, if they choose to go to Orlando, the orientation is a short zoom meeting and the dining card and bonus voucher is subsequently emailed to them.",
    "Upon completion of their orientation, they receive their $100 dining gift card, and their voucher for the bonus trip to their choice of 30 destinations.",
    "There is no additional deposit or orientation involved in this Bonus trip.",
    "Upon completion of their second vacation they receive their $100 deposit back. In Vegas, they get it in the form of a check at our offices, and at any of the other destinations, it will be mailed to them.",
  ],
  /** The paragraphs after the steps, before the FAQ. */
  why: [
    "It's really that simple! This may sound too good to be true, but here's why hotels do this:",
    "Hotels are filling up their rooms, and helping non-profits with an exciting, no obligation travel voucher. These vacations breed goodwill and translate into future engagement with the donors.",
    'If a donor is not interested, they can gift it to a child, neighbor or friend…or simply discard it. These vouchers are to be used as a "Thank You" to your donors and not intended for sale.',
  ],
  faqHeading: "FREQUENTLY ASKED QUESTIONS",
  faqs: [
    {
      question: "Is this a time share presentation?",
      answer: [
        "No! This is a Free Basic Membership to ShareLife Travel, a travel savings private club, where members save $$$ above and beyond the nationally recognized sites you hear about everyday. In fact, they have a double the difference money-back guarantee backing up that claim.",
      ],
    },
    {
      question: "How can we use these Vouchers?",
      answer: [
        'We have seen groups deploy these vouchers in many different ways, such as a "Thank You" for:',
      ],
      bullets: [
        "Each ticket purchased",
        "Each Bid placed",
        "Each donation made",
        "Sponsorships or Silent Auction Item donations",
      ],
    },
    {
      question: "Is the ShareLife Vacations deposit required?",
      answer: [
        "Yes. It is required in order to get your Bonus Dining Gift Card and 2nd Bonus trip to over 30+ destinations. The deposit is truly just to make sure we don't pay for reserved rooms that go unused. Historically, there are a lot of no shows if we were to charge no deposit.",
      ],
    },
    {
      question: "When do travelers get their $100 deposit refunded?",
      answer: [
        "Upon completion of their second trip, they will receive their deposit returned.",
      ],
    },
    {
      question: "Do our guests automatically get the Bonus Gift Card and 2nd Vacation?",
      answer: [
        "No, not automatically. It is a Bonus for sitting thru the 12-15 minute orientation. Upon completion, they get both the Gift Card and an invitation for their second vacation which has an expanded destination list of 30 or so destinations",
      ],
    },
    {
      question: "Do guests have to sit thru another orientation during their second vacation?",
      answer: [
        "No! There is no second orientation, and the list of destination cities is greatly expanded to 30+ destinations.",
      ],
    },
    {
      question: "How long is the Orientation and can it be done virtually?",
      answer: [
        "The Orientation can be done in person, via Zoom or virtually as we have an automated interactive presentation that shows new guests how the membership works and what upgrades are available to them. The automated presentation takes roughly 12 minutes to view.",
        "Our number one objective is to get our guests to use the platform to book their hotel stays instead of using Expedia or Travelocity. They get the guaranteed lowest price or double the difference back in cash.",
      ],
    },
    {
      question:
        "Are you the one who emails the voucher to individuals? (i.e. do charities have to give you lists of their donors?)",
      answer: [
        "We (CharityWorks) prefer that your organization send the vouchers to individuals via e-delivery. We also have hard copy, full color 3x9 vouchers, but they cost something to print and deliver.",
      ],
    },
    {
      question: "Are the Vouchers transferable?",
      answer: [
        "The vouchers are 100% transferable, and anybody such as family members, friends, neighbors, colleagues and/or associates may be given these vouchers.",
      ],
    },
    {
      question: "Is there an expiration date on the Vouchers?",
      answer: [
        "The vouchers say that you should register within 30 days and book within a year. However, we will always honor them.",
      ],
    },
    {
      question: "Are there any restrictions on these Vouchers?",
      answer: [
        "The only restriction is that these vouchers cannot be sold or used as Silent or Live auction items. They are a gift, or bonus to your fundraising initiatives.",
      ],
    },
    {
      question: "Why do these properties do this?",
      answer: [
        "Properties fill rooms during the mid week and thus grow their occupancy levels. These guests eat, drink and in some cases gamble on the property, thus deriving derivative revenue streams from guests who are filling their rooms. They also cannot give away FREE rooms (they do have paying guests) so partnering with your charity to achieve these goals is a way in which they can do this, while supporting many great causes.",
      ],
    },
  ] satisfies VoucherFaq[],
};

export const voucherTerms = {
  seo: {
    title: "FREE Vacation Voucher Program: Terms and Conditions",
    description:
      "Terms and conditions of the CharityWorks FREE Vacation Voucher Program and the $100 Dining Advantage Gift Card.",
  },
  heading: "FREE Vacation Voucher Program",
  lede: "Terms and Conditions",
  /** One flat list, in Lauri's order. */
  terms: [
    "Valid for two adults over 21 years of age only.",
    "30 days advance booking required for reservations.",
    "Dates are subject to availability.",
    "Valid for Sunday through Thursday nights. Friday & Saturday nights may be available for a surcharge.",
    "Transportation, incidentals and daily resort fees are not included.",
    "One voucher per household.",
    "No cash value.",
    "Group travel is strictly prohibited.",
    "Group travel is defined as multiple certificates being used by groups and/or related parties for concurrent or consecutive stays.",
    "Must register within 30 days.",
    "One-year travel window from your registration date",
    "Refundable deposit required before traveling.",
    "Deposit will be refunded in full upon completion of travel.",
    "Dining Advantage Card and Bonus Trip Certificate to be issued at ShareLife Vacations Orientation.",
    "Void where prohibited.",
  ],
  dining: {
    heading: "$100 Dining Advantage Gift Card Details",
    paragraphs: [
      "Gift card will be activated in your traveler portal. Promotional gift card or code may be used to purchase offers at DiningAdvantage.com or on the mobile app. Card and offers used at participating restaurants, retail or internet merchants, as applicable. Terms and conditions apply.",
    ],
  },
};
