import type { DonorSection } from "@/content/types";
import { Icon } from "@/components/Icon";
import { at, editable } from "@/lib/editable";

/**
 * The free donor incentive (Las Vegas package) block.
 * A secondary hook, so it sits low on the home page rather than competing with
 * the primary reasons to choose CharityWorks.
 */
export function DonorIncentive({
  donor,
  path,
}: {
  donor: DonorSection;
  /** Where this block sits in the page document — `"donor"` on the home page. */
  path?: string;
}) {
  return (
    <section className="pad donor" id="donor" aria-labelledby="donor-heading">
      <div className="wrap center">
        <span className="donor-tag reveal" {...editable(at(path, "tag"))}>
          {donor.tag}
        </span>
        <h2
          className="section-title reveal"
          id="donor-heading"
          {...editable(at(path, "header", "title"))}
        >
          {donor.header.title}
        </h2>
        <p className="section-lede reveal" {...editable(at(path, "header", "lede"))}>
          {donor.header.lede}
        </p>
        <div className="donor-cards">
          {donor.perks.map((perk, index) => (
            <div
              key={perk.id}
              className={`donor-card reveal${index > 0 ? ` d${index}` : ""}`}
            >
              <div
                className="emoji"
                aria-hidden="true"
                {...editable(at(path, "perks", index, "emoji"))}
              >
                <Icon name={perk.emoji} />
              </div>
              <h3 {...editable(at(path, "perks", index, "action"))}>{perk.action}</h3>
              <div className="arrow">
                <span aria-hidden="true">→</span>{" "}
                <span className="sr-only">earns a</span>
                <span {...editable(at(path, "perks", index, "reward"))}>
                  {perk.reward}
                </span>
              </div>
              <p {...editable(at(path, "perks", index, "note"))}>{perk.note}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
