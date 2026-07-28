import type { DonorSection } from "@/content/types";

/**
 * The free donor incentive (Las Vegas package) block.
 * A secondary hook, so it sits low on the home page rather than competing with
 * the primary reasons to choose CharityWorks.
 */
export function DonorIncentive({ donor }: { donor: DonorSection }) {
  return (
    <section className="pad donor" id="donor" aria-labelledby="donor-heading">
      <div className="wrap center">
        <span className="donor-tag reveal">{donor.tag}</span>
        <h2 className="section-title reveal" id="donor-heading">
          {donor.header.title}
        </h2>
        <p className="section-lede reveal">{donor.header.lede}</p>
        <div className="donor-cards">
          {donor.perks.map((perk, index) => (
            <div
              key={perk.id}
              className={`donor-card reveal${index > 0 ? ` d${index}` : ""}`}
            >
              <div className="emoji" aria-hidden="true">
                {perk.emoji}
              </div>
              <h3>{perk.action}</h3>
              <div className="arrow">
                <span aria-hidden="true">→</span>{" "}
                <span className="sr-only">earns a</span>
                {perk.reward}
              </div>
              <p>{perk.note}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
