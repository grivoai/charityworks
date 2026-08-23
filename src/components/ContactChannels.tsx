import { Icon } from "@/components/Icon";
import type { SiteContent } from "@/content/types";

/**
 * The ways to reach us, as rows.
 *
 * Extracted because it was written out twice — identically — on the home page
 * and the contact page, and now three times over with the site preview. Two
 * copies of the same markup is how one of them quietly stops matching the
 * other; the third would have guaranteed it.
 *
 * The reveal delays are positional (`d1`, `d2`, …), so this takes the whole
 * list rather than being called per row: the index has to be the index within
 * the block, and a caller counting rows itself is the part that would drift.
 */
export function ContactChannels({
  channels,
  reveal = true,
}: {
  channels: SiteContent["contact"]["channels"];
  /**
   * Whether the rows fade in as they are scrolled to.
   *
   * Off for the site preview, and not as a matter of taste. `.reveal` is
   * `opacity: 0` until `RevealObserver` adds `.in` imperatively — so React
   * holds no record of that class, and the next render rewrites `className`
   * and drops it. In the preview these rows re-render on every keystroke,
   * which would fade the contact details out and leave them out. The warning
   * at the top of RevealObserver is about exactly this.
   */
  reveal?: boolean;
}) {
  return (
    <div className="contact-info">
      {channels.map((channel, index) => (
        <div
          key={channel.id}
          className={reveal ? `ci-row reveal d${index + 1}` : "ci-row"}
        >
          <div className="ci-ico" aria-hidden="true">
            <Icon name={channel.icon} />
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
  );
}
