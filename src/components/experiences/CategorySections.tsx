import { EXPERIENCE_CATEGORIES, implementedCategories } from "@/experiences/categories";
import { FeaturedCategoryCard, UpcomingCategoryRow } from "./CategoryCards";

/**
 * The single presentation of experience categories, used by the homepage and
 * the selection flow so the two can never drift apart.
 */
export function CategorySections() {
  const implemented = implementedCategories();
  const upcoming = EXPERIENCE_CATEGORIES.filter((category) => category.status === "upcoming");

  return (
    <div className="space-y-9">
      <div className="grid gap-5 sm:grid-cols-2">
        {implemented.map((category) => (
          <FeaturedCategoryCard key={category.id} category={category} />
        ))}
      </div>

      {upcoming.length > 0 ? (
        <div>
          <p className="mb-3 text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[#a394b4]">
            more moments on the way
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {upcoming.map((category) => (
              <UpcomingCategoryRow key={category.id} category={category} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
