import Link from "next/link";
import { Building2, Clock3, MapPin, Phone, Star } from "lucide-react";
import { fallbackImage, type Project, type Store } from "@/lib/data";
import { getCategory } from "@/lib/helpers";

type StoreCardProps = {
  store: Store;
  project?: Project;
  distance?: number | null;
};

export function StoreCard({ store, project, distance }: StoreCardProps) {
  const category = getCategory(store.category);
  const distanceLabel = distance === undefined ? null : distance === null ? "Chưa có khoảng cách" : `${distance.toFixed(1)} km`;

  return (
    <article className="store-card">
      <figure>
        <img src={store.image || project?.image || fallbackImage} alt={store.name} loading="lazy" />
      </figure>
      <div className="grid gap-3 p-4">
        <div>
          <span className="tag mb-2">{category.label}</span>
          <h3 className="h3">{store.name}</h3>
        </div>
        <p className="body-text text-sm">{store.note}</p>
        <div className="meta-grid">
          {distanceLabel ? (
            <span>
              <MapPin size={14} aria-hidden />
              {distanceLabel}
            </span>
          ) : null}
          {project ? (
            <span>
              <Building2 size={14} aria-hidden />
              {project.name}
            </span>
          ) : null}
          <span>
            <MapPin size={14} aria-hidden />
            {store.floor}
          </span>
          <span>
            <Clock3 size={14} aria-hidden />
            {store.hours}
          </span>
          <strong>
            <Star size={14} aria-hidden />
            {store.rating.toFixed(1)}/5
          </strong>
        </div>
        <div className="action-row">
          <Link className="primary-button" href={`/stores/${store.id}`}>
            Xem chi tiết
          </Link>
          <a className="secondary-button" href={`tel:${store.phone.replace(/\s/g, "")}`}>
            <Phone size={15} aria-hidden />
            Gọi điện
          </a>
        </div>
      </div>
    </article>
  );
}
