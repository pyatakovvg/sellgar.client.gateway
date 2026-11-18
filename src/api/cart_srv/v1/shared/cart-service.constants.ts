export const CART_COMMAND_SERVICE = 'CART_COMMAND_SERVICE';
export const CART_REALTIME_SERVICE = 'CART_REALTIME_SERVICE';
export const CartServiceCommand = {
  get: 'cart.get',
  add: 'cart.item.add',
  setQuantity: 'cart.item.setQuantity',
  remove: 'cart.item.remove',
} as const;
