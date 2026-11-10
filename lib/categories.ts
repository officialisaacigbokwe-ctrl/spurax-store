export type CategoryDef = {
  name: string;
  emoji: string;
  aliases: string[];
};

export const CATEGORIES: CategoryDef[] = [
  { name: "Women's Clothes", emoji: "👗", aliases: ["women", "womens", "womens clothing", "women clothes", "ladies", "dresses"] },
  { name: "Men's Clothes", emoji: "👔", aliases: ["men", "mens", "mens clothing", "men clothes"] },
  { name: "Shoes", emoji: "👟", aliases: ["shoe", "footwear", "sneakers", "sandals", "slippers"] },
  { name: "Bags", emoji: "👜", aliases: ["bag", "handbags", "backpacks"] },
  { name: "Accessories", emoji: "⌚", aliases: ["accessory", "jewellery", "jewelry", "watches", "belts", "caps", "hats", "sunglasses"] },
  { name: "Beauty & Skincare", emoji: "💄", aliases: ["beauty", "skincare", "makeup", "cosmetics", "perfume", "fragrance", "hair"] },
  { name: "Kids & Baby", emoji: "🧸", aliases: ["kids", "baby", "children", "toys"] },
  { name: "Phones & Gadgets", emoji: "📱", aliases: ["phones", "phone", "gadgets", "gadget"] },
  { name: "Electronics", emoji: "🔌", aliases: ["electronic", "appliances", "computers", "laptops"] },
  { name: "Home & Living", emoji: "🏠", aliases: ["home", "living", "furniture", "decor", "kitchen"] },
  { name: "Food & Groceries", emoji: "🛒", aliases: ["food", "groceries", "grocery", "snacks", "drinks"] },
  { name: "Health & Wellness", emoji: "🌿", aliases: ["health", "wellness"] },
  { name: "Sports & Fitness", emoji: "🏋️", aliases: ["sports", "sport", "fitness", "gym"] },
  { name: "Books & Stationery", emoji: "📚", aliases: ["books", "book", "stationery", "office"] },
  { name: "Other", emoji: "✨", aliases: ["others", "misc", "miscellaneous", "general"] },
];

function key(value: string) {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
}

// Returns the official category name for what a seller typed, or null.
export function matchCategory(value: string): string | null {
  const wanted = key(value);

  if (!wanted) return null;

  for (const category of CATEGORIES) {
    if (
      key(category.name) === wanted ||
      category.aliases.some((alias) => key(alias) === wanted)
    ) {
      return category.name;
    }
  }

  return null;
}

export function categoryHref(name: string) {
  return `/shop?category=${encodeURIComponent(name)}`;
}