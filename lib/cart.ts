export type CartItem = {
  productId: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  imageUrl: string | null;
  size: string;
  color: string;
  quantity: number;
};

const CART_KEY = "spurax-cart";

export function getCart(): CartItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const savedCart = localStorage.getItem(CART_KEY);

    if (!savedCart) {
      return [];
    }

    return JSON.parse(savedCart);
  } catch {
    return [];
  }
}

export function saveCart(cart: CartItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function addToCart(item: CartItem) {
  const cart = getCart();

  const existingItem = cart.find(
    (cartItem) =>
      cartItem.productId === item.productId &&
      cartItem.size === item.size &&
      cartItem.color === item.color
  );

  if (existingItem) {
    existingItem.quantity += item.quantity;
  } else {
    cart.push(item);
  }

  saveCart(cart);

window.dispatchEvent(new Event("spurax-cart-updated"));
}

export function removeFromCart(
  productId: string,
  size: string,
  color: string
) {
  const cart = getCart();

  const updatedCart = cart.filter(
    (item) =>
      !(
        item.productId === productId &&
        item.size === size &&
        item.color === color
      )
  );

  saveCart(updatedCart);

  window.dispatchEvent(new Event("spurax-cart-updated"));
}

export function updateCartQuantity(
  productId: string,
  size: string,
  color: string,
  quantity: number
) {
  const cart = getCart();

  const item = cart.find(
    (cartItem) =>
      cartItem.productId === productId &&
      cartItem.size === size &&
      cartItem.color === color
  );

  if (item) {
    item.quantity = Math.max(1, quantity);
  }

  saveCart(cart);

  window.dispatchEvent(new Event("spurax-cart-updated"));
}

export function clearCart() {
  saveCart([]);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("spurax-cart-updated"));
  }
}
export function getCartCount() {
  return getCart().reduce(
    (total, item) => total + item.quantity,
    0
  );
}