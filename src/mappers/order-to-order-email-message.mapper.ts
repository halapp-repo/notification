import {
  ExtraChargeType,
  InventoryVM,
  OrderVM,
  OrganizationVM,
  PaymentMethodType,
  translatePaymentMethodType,
} from "@halapp/common";
import { trMoment } from "../utils/timezone";
import { IMapper } from "./base.mapper";

type ExtendedOrderVM = OrderVM & {
  Organization: OrganizationVM;
  Inventories: InventoryVM[];
};

export class OrderToOrderEmailMessageMapper extends IMapper<
  ExtendedOrderVM,
  OrderEmail
> {
  toDTO(arg: ExtendedOrderVM): OrderEmail {
    const deliveryCharge = arg.ExtraCharges?.find(
      (e) => e.Type === ExtraChargeType.lowPriceDeliveryCharge
    );
    const creditCharge = arg.ExtraCharges?.find(
      (e) => e.Type === ExtraChargeType.usingCreditCharge
    );
    const paymentMethodType = translatePaymentMethodType(arg.PaymentMethodType);
    const deliveryTime = trMoment(arg.DeliveryTime);
    const deliveryTimeStr = `${deliveryTime.format(
      "DD MMM (HH:mm"
    )}-${deliveryTime.clone().add(1, "h").format("HH:mm)")}`;

    return {
      orderId: arg.Id,
      orderUrl: `https://halapp.io/orders/${arg.Id}`,
      createdDate: trMoment(arg.CreatedDate).format("DD.MM.YYYY HH:mm"),
      organizationName: arg.Organization.Name,
      balance: new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: "TRY",
      }).format(arg.Organization.Balance),
      availableCredit: new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: "TRY",
      }).format(arg.Organization.Balance + arg.Organization.CreditLimit),
      note: arg.Note || "",
      address: {
        addressline: arg.DeliveryAddress.AddressLine,
        county: arg.DeliveryAddress.County,
        city: arg.DeliveryAddress.City,
        zipcode: arg.DeliveryAddress.ZipCode,
        country: arg.DeliveryAddress.Country,
      },
      paidWithBalance: arg.PaymentMethodType === PaymentMethodType.balance,
      paymentType: paymentMethodType,
      deliveryTime: deliveryTimeStr,
      totalPrice: new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: "TRY",
      }).format(arg.TotalPrice),
      deliveryCharge: deliveryCharge
        ? new Intl.NumberFormat("tr-TR", {
            style: "currency",
            currency: "TRY",
          }).format(deliveryCharge.Price)
        : "Ücretsiz",
      creditCharge: creditCharge
        ? new Intl.NumberFormat("tr-TR", {
            style: "currency",
            currency: "TRY",
          }).format(creditCharge.Price)
        : "Ücretsiz",
      items: arg.Items.map((i) => ({
        name:
          arg.Inventories.find((inv) => inv.ProductId === i.ProductId)?.Name ||
          i.ProductId,
        count: `${i.Count}`,
        unit: i.Unit,
        price: new Intl.NumberFormat("tr-TR", {
          style: "currency",
          currency: "TRY",
        }).format(i.Price),
        totalprice: new Intl.NumberFormat("tr-TR", {
          style: "currency",
          currency: "TRY",
        }).format(i.Price * i.Count),
      })),
    };
  }
  toModel(): ExtendedOrderVM {
    throw new Error("Not Implemented");
  }
}
