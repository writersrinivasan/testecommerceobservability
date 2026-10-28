// Customer-support knowledge base indexed by the RAG layer.

export interface KbDoc {
  id: string;
  title: string;
  text: string;
}

export const KNOWLEDGE_BASE: KbDoc[] = [
  { id: "KB-01", title: "Return Policy",
    text: "Most items can be returned within 10 days of delivery. Electronics and mobiles have a 7 day replacement-only window for defective or damaged items. Books, beauty and personal care products are non-returnable once opened. Start a return from Your Orders and schedule a free pickup." },
  { id: "KB-02", title: "Refund Timelines",
    text: "Refunds are issued after the returned item passes quality check. UPI and wallet refunds take 1-2 business days, credit and debit card refunds take 5-7 business days, and cash on delivery orders are refunded to your bank account within 3 days." },
  { id: "KB-03", title: "Shipping & Delivery Options",
    text: "Standard delivery is free on orders above ₹499 and takes 3-5 days. Kart Express items ship the next day in 50+ cities for ₹49, or free for AgentKart Plus members. Same-day delivery is available in metro pincodes for orders placed before 12 noon." },
  { id: "KB-04", title: "Cash on Delivery",
    text: "Cash on delivery (COD) is available for orders up to ₹50,000. A convenience fee of ₹10 applies. You can also pay with UPI on delivery by scanning the QR code shown by the delivery partner." },
  { id: "KB-05", title: "Warranty Claims",
    text: "Electronics carry a 1 year manufacturer warranty unless stated otherwise. Laptops and TVs include on-site service. To claim warranty, keep your invoice from Your Orders and contact the brand service centre or raise a ticket with AgentKart support." },
  { id: "KB-06", title: "Coupons & Offers",
    text: "Active coupon codes: WELCOME200 gives ₹200 off the first order above ₹999. SAVE10 gives 10% off up to ₹1,000 on electronics. AGENTIC25 gives 25% off books. Only one coupon can be applied per order and coupons cannot be combined with no-cost EMI." },
  { id: "KB-07", title: "AgentKart Plus Membership",
    text: "AgentKart Plus costs ₹999 per year and includes free Kart Express delivery, early access to lightning deals, 5% extra cashback on the AgentKart credit card and priority customer support." },
  { id: "KB-08", title: "Payment Methods & EMI",
    text: "We accept UPI, credit cards, debit cards, net banking, wallets and cash on delivery. No-cost EMI is available on orders above ₹3,000 with select bank credit cards for 3, 6 and 9 month tenures." },
  { id: "KB-09", title: "Order Cancellation",
    text: "Orders can be cancelled free of charge any time before they are shipped from Your Orders. Once shipped, you can refuse the delivery or request a return after it arrives. Refunds for prepaid cancelled orders follow the standard refund timelines." },
  { id: "KB-10", title: "Damaged or Wrong Item",
    text: "If you receive a damaged, defective or wrong item, report it within 48 hours with photos. We will arrange a free replacement or full refund. Do not discard the original packaging until the pickup is complete." },
  { id: "KB-11", title: "Exchange Policy",
    text: "Fashion and footwear items can be exchanged for a different size or colour within 10 days of delivery, subject to availability. The exchange pickup and new delivery happen together at no extra cost." },
  { id: "KB-12", title: "Privacy & Data Security",
    text: "AgentKart never asks for your OTP, card PIN or CVV over phone, chat or email. Payment information is tokenised and encrypted. Our AI assistant does not store payment details and masks personal data in logs." },
];
