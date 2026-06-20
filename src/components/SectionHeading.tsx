import type { ReactNode } from "react";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  centered?: boolean;
  action?: ReactNode;
};

export function SectionHeading({ eyebrow, title, description, centered = false, action }: SectionHeadingProps) {
  return (
    <div className={`section-heading ${centered ? "center" : ""} ${action ? "with-action" : ""}`}>
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2 className="h2">{title}</h2>
        {description ? <p className="body-text mt-3">{description}</p> : null}
        {centered ? <span className="title-divider" aria-hidden /> : null}
      </div>
      {action ? <div className="section-heading-action">{action}</div> : null}
    </div>
  );
}
