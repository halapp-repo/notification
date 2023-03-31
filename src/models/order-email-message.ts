interface OrderItem {
  name: string;
  count: string;
  unit: string;
  price: string;
  totalprice: string;
}

interface OrderEmail {
  orderId: string;
  orderUrl: string;
  createdDate: string;
  organizationName: string;
  balance: string;
  availableCredit: string;
  note: string;
  address: {
    addressline: string;
    county: string;
    city: string;
    zipcode: string;
    country: string;
  };
  paidWithBalance: boolean;
  paymentType: string;
  deliveryTime: string;
  totalPrice: string;
  deliveryCharge: string;
  creditCharge: string;
  items: OrderItem[];
}
