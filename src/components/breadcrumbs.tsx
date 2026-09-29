import Link from "next/link";
import type { BreadcrumbCrumb } from "@/lib/json-ld";

interface BreadcrumbsProps {
  crumbs: BreadcrumbCrumb[];
  /** Extra classes on the wrapping nav (e.g. margin). */
  className?: string;
}

/**
 * Visible breadcrumb trail matching BreadcrumbList JSON-LD.
 * Last crumb is the current page (not linked).
 */
export function Breadcrumbs({ crumbs, className = "" }: BreadcrumbsProps) {
  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <li key={`${crumb.path}-${crumb.name}`} className="flex items-center gap-1.5">
              {i > 0 ? (
                <span aria-hidden="true" className="text-gray-300 dark:text-gray-600">
                  /
                </span>
              ) : null}
              {isLast ? (
                <span
                  aria-current="page"
                  className="text-gray-600 dark:text-gray-300 font-medium"
                >
                  {crumb.name}
                </span>
              ) : (
                <Link
                  href={crumb.path}
                  className="hover:text-ketchup dark:hover:text-mustard transition-colors"
                >
                  {crumb.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
