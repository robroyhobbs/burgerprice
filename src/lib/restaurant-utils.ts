/**
 * Get a URL for a restaurant — returns the website if valid, otherwise a Google Maps search link.
 */
export function getRestaurantUrl(
  name: string,
  city: string,
  state: string,
  website?: string | null,
): string {
  if (
    website &&
    (website.startsWith("https://") || website.startsWith("http://"))
  ) {
    return website;
  }

  return `https://www.google.com/maps/search/${encodeURIComponent(name + " " + city + " " + state)}`;
}
