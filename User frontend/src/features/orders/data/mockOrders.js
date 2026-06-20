export const mockOrders = [
  {
    id: "LOFT90812",
    _id: "LOFT90812",
    orderNumber: "LOFT90812",
    status: "Pending",
    orderStatus: "Pending",
    createdAt: "2026-06-16T14:30:00.000Z",
    deliveredAt: null,
    total: 8500,
    totalAmount: 8500,
    grandTotal: 8500,
    itemsPrice: 8200,
    shippingPrice: 300,
    taxPrice: 0,
    discount: 0,
    paymentMethod: "Razorpay",
    shippingAddress: {
      address: "Flat 12A, Sunset Towers, Bandra West",
      city: "Mumbai",
      postalCode: "400050",
      country: "India"
    },
    items: [
      {
        product: "p_silk_shirt",
        name: "LOFT Premium Silk Shirt",
        price: 4500,
        qty: 1,
        quantity: 1,
        size: "M",
        color: "Ivory White",
        image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=300&auto=format&fit=crop"
      },
      {
        product: "p_linen_trouser",
        name: "Tailored Linen Trousers",
        price: 3700,
        qty: 1,
        quantity: 1,
        size: "32",
        color: "Oatmeal",
        image: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?q=80&w=300&auto=format&fit=crop"
      }
    ]
  },
  {
    id: "LOFT90451",
    _id: "LOFT90451",
    orderNumber: "LOFT90451",
    status: "Confirmed",
    orderStatus: "Confirmed",
    createdAt: "2026-06-15T09:15:00.000Z",
    deliveredAt: null,
    total: 12900,
    totalAmount: 12900,
    grandTotal: 12900,
    itemsPrice: 12900,
    shippingPrice: 0,
    taxPrice: 0,
    discount: 0,
    paymentMethod: "Razorpay",
    shippingAddress: {
      address: "7th Avenue Villa, Koramangala",
      city: "Bengaluru",
      postalCode: "560034",
      country: "India"
    },
    items: [
      {
        product: "p_wool_coat",
        name: "Signature Merino Wool Coat",
        price: 12900,
        qty: 1,
        quantity: 1,
        size: "L",
        color: "Camel",
        image: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=300&auto=format&fit=crop"
      }
    ]
  },
  {
    id: "LOFT89312",
    _id: "LOFT89312",
    orderNumber: "LOFT89312",
    status: "Packed",
    orderStatus: "Packed",
    createdAt: "2026-06-14T11:00:00.000Z",
    deliveredAt: null,
    total: 5400,
    totalAmount: 5400,
    grandTotal: 5400,
    itemsPrice: 5400,
    shippingPrice: 0,
    taxPrice: 0,
    discount: 0,
    paymentMethod: "Razorpay",
    shippingAddress: {
      address: "House 45, Sector 15-A",
      city: "Noida",
      postalCode: "201301",
      country: "India"
    },
    items: [
      {
        product: "p_silk_scarf",
        name: "Monogram Silk Scarf",
        price: 5400,
        qty: 1,
        quantity: 1,
        size: "OS",
        color: "Deep Gold",
        image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=300&auto=format&fit=crop"
      }
    ]
  },
  {
    id: "LOFT88123",
    _id: "LOFT88123",
    orderNumber: "LOFT88123",
    status: "Shipped",
    orderStatus: "Shipped",
    createdAt: "2026-06-13T10:00:00.000Z",
    deliveredAt: null,
    total: 9800,
    totalAmount: 9800,
    grandTotal: 9800,
    itemsPrice: 9800,
    shippingPrice: 0,
    taxPrice: 0,
    discount: 0,
    paymentMethod: "Razorpay",
    shippingAddress: {
      address: "Penthouse C, Regency Manor, Boat Club Road",
      city: "Pune",
      postalCode: "411001",
      country: "India"
    },
    items: [
      {
        product: "p_cashmere_sweater",
        name: "Oversized Cashmere Crewneck",
        price: 9800,
        qty: 1,
        quantity: 1,
        size: "S",
        color: "Heather Gray",
        image: "https://images.unsplash.com/photo-1614975058789-41316d0e2e9c?q=80&w=300&auto=format&fit=crop"
      }
    ]
  },
  {
    id: "LOFT87410",
    _id: "LOFT87410",
    orderNumber: "LOFT87410",
    status: "Out For Delivery",
    orderStatus: "Out For Delivery",
    createdAt: "2026-06-13T08:20:00.000Z",
    deliveredAt: null,
    total: 3900,
    totalAmount: 3900,
    grandTotal: 3900,
    itemsPrice: 3900,
    shippingPrice: 0,
    taxPrice: 0,
    discount: 0,
    paymentMethod: "COD",
    shippingAddress: {
      address: "18/3, Ballygunge Circular Road",
      city: "Kolkata",
      postalCode: "700019",
      country: "India"
    },
    items: [
      {
        product: "p_leather_belt",
        name: "Classic Leather Belt",
        price: 3900,
        qty: 1,
        quantity: 1,
        size: "90",
        color: "Ebony Black",
        image: "https://images.unsplash.com/photo-1624222247344-550fb8ecf7db?q=80&w=300&auto=format&fit=crop"
      }
    ]
  },
  {
    id: "LOFT86749",
    _id: "LOFT86749",
    orderNumber: "LOFT86749",
    status: "Delivered",
    orderStatus: "Delivered",
    createdAt: "2026-06-12T10:00:00.000Z",
    deliveredAt: "2026-06-14T15:30:00.000Z", // Delivered ~2 days ago (Eligible for return)
    total: 15500,
    totalAmount: 15500,
    grandTotal: 15500,
    itemsPrice: 15500,
    shippingPrice: 0,
    taxPrice: 0,
    discount: 0,
    paymentMethod: "Razorpay",
    shippingAddress: {
      address: "Villa 9, Palm Greens, Jubilee Hills",
      city: "Hyderabad",
      postalCode: "500033",
      country: "India"
    },
    items: [
      {
        product: "p_chelsea_boot",
        name: "Handcrafted Suede Chelsea Boots",
        price: 15500,
        qty: 1,
        quantity: 1,
        size: "42",
        color: "Cocoa Brown",
        image: "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?q=80&w=300&auto=format&fit=crop"
      }
    ]
  },
  {
    id: "LOFT81920",
    _id: "LOFT81920",
    orderNumber: "LOFT81920",
    status: "Delivered",
    orderStatus: "Delivered",
    createdAt: "2026-06-01T11:00:00.000Z",
    deliveredAt: "2026-06-04T12:00:00.000Z", // Delivered 12 days ago (Outside 7-day return window)
    total: 6800,
    totalAmount: 6800,
    grandTotal: 6800,
    itemsPrice: 6800,
    shippingPrice: 0,
    taxPrice: 0,
    discount: 0,
    paymentMethod: "Razorpay",
    shippingAddress: {
      address: "A-402, Signature Heights, Adyar",
      city: "Chennai",
      postalCode: "600020",
      country: "India"
    },
    items: [
      {
        product: "p_silk_cami",
        name: "Minimalist Silk Camisole",
        price: 6800,
        qty: 1,
        quantity: 1,
        size: "S",
        color: "Champagne Gold",
        image: "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?q=80&w=300&auto=format&fit=crop"
      }
    ]
  },
  {
    id: "LOFT85523",
    _id: "LOFT85523",
    orderNumber: "LOFT85523",
    status: "Cancelled",
    orderStatus: "Cancelled",
    createdAt: "2026-06-11T12:00:00.000Z",
    deliveredAt: null,
    total: 4200,
    totalAmount: 4200,
    grandTotal: 4200,
    itemsPrice: 4200,
    shippingPrice: 0,
    taxPrice: 0,
    discount: 0,
    paymentMethod: "Razorpay",
    shippingAddress: {
      address: "302, Royal Enclave, Vasant Vihar",
      city: "New Delhi",
      postalCode: "110057",
      country: "India"
    },
    items: [
      {
        product: "p_sunglasses",
        name: "Editorial Tortoiseshell Sunglasses",
        price: 4200,
        qty: 1,
        quantity: 1,
        size: "OS",
        color: "Amber",
        image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=300&auto=format&fit=crop"
      }
    ],
    cancellationReason: "Ordered by mistake",
    cancelledAt: "2026-06-11T12:15:00.000Z",
    refundAmount: 4200,
    refundMethod: "Razorpay",
    expectedRefundDate: "2026-06-16T12:15:00.000Z",
    refundStatus: "Completed"
  },
  {
    id: "LOFT84910",
    _id: "LOFT84910",
    orderNumber: "LOFT84910",
    status: "Return Requested",
    orderStatus: "Return Requested",
    createdAt: "2026-06-08T09:00:00.000Z",
    deliveredAt: "2026-06-10T14:00:00.000Z",
    total: 18500,
    totalAmount: 18500,
    grandTotal: 18500,
    itemsPrice: 18500,
    shippingPrice: 0,
    taxPrice: 0,
    discount: 0,
    paymentMethod: "Razorpay",
    shippingAddress: {
      address: "B-2, Golf Links",
      city: "New Delhi",
      postalCode: "110003",
      country: "India"
    },
    items: [
      {
        product: "p_wool_tweed_jacket",
        name: "Luxe Wool Tweed Jacket",
        price: 18500,
        qty: 1,
        quantity: 1,
        size: "M",
        color: "Classic Bouclé",
        image: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=300&auto=format&fit=crop"
      }
    ],
    returnRequest: {
      reason: "Wrong Size",
      comments: "The sleeves are a bit too short for my preference. Need to size up.",
      images: ["https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=150&auto=format&fit=crop"],
      requestedAt: "2026-06-11T16:00:00.000Z"
    }
  },
  {
    id: "LOFT83109",
    _id: "LOFT83109",
    orderNumber: "LOFT83109",
    status: "Return Approved",
    orderStatus: "Return Approved",
    createdAt: "2026-06-06T10:00:00.000Z",
    deliveredAt: "2026-06-08T16:00:00.000Z",
    total: 7500,
    totalAmount: 7500,
    grandTotal: 7500,
    itemsPrice: 7500,
    shippingPrice: 0,
    taxPrice: 0,
    discount: 0,
    paymentMethod: "Razorpay",
    shippingAddress: {
      address: "House 72, Sector 8",
      city: "Chandigarh",
      postalCode: "160009",
      country: "India"
    },
    items: [
      {
        product: "p_silk_top",
        name: "Gathered Silk Top",
        price: 7500,
        qty: 1,
        quantity: 1,
        size: "S",
        color: "Emerald",
        image: "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?q=80&w=300&auto=format&fit=crop"
      }
    ],
    returnRequest: {
      reason: "Not As Expected",
      comments: "Color looks slightly different in person.",
      requestedAt: "2026-06-09T10:00:00.000Z",
      approvedAt: "2026-06-11T12:00:00.000Z"
    }
  },
  {
    id: "LOFT82918",
    _id: "LOFT82918",
    orderNumber: "LOFT82918",
    status: "Return Rejected",
    orderStatus: "Return Rejected",
    createdAt: "2026-06-05T09:00:00.000Z",
    deliveredAt: "2026-06-07T11:00:00.000Z",
    total: 3500,
    totalAmount: 3500,
    grandTotal: 3500,
    itemsPrice: 3500,
    shippingPrice: 0,
    taxPrice: 0,
    discount: 0,
    paymentMethod: "Razorpay",
    shippingAddress: {
      address: "C-15, Green Park Extension",
      city: "New Delhi",
      postalCode: "110016",
      country: "India"
    },
    items: [
      {
        product: "p_cotton_tshirt",
        name: "Organic Cotton Ribbed Tee",
        price: 3500,
        qty: 1,
        quantity: 1,
        size: "M",
        color: "Optic White",
        image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=300&auto=format&fit=crop"
      }
    ],
    returnRequest: {
      reason: "Wrong Size",
      comments: "Fits fine, but changed my mind",
      requestedAt: "2026-06-08T10:00:00.000Z",
      rejectedAt: "2026-06-10T14:30:00.000Z",
      rejectReason: "Product shows visible signs of wear and tags have been removed."
    }
  },
  {
    id: "LOFT80192",
    _id: "LOFT80192",
    orderNumber: "LOFT80192",
    status: "Pickup Scheduled",
    orderStatus: "Pickup Scheduled",
    createdAt: "2026-06-02T10:00:00.000Z",
    deliveredAt: "2026-06-04T15:00:00.000Z",
    total: 11000,
    totalAmount: 11000,
    grandTotal: 11000,
    itemsPrice: 11000,
    shippingPrice: 0,
    taxPrice: 0,
    discount: 0,
    paymentMethod: "Razorpay",
    shippingAddress: {
      address: "12-B, Orchid towers, High Gates",
      city: "Bengaluru",
      postalCode: "560001",
      country: "India"
    },
    items: [
      {
        product: "p_clutch",
        name: "Structured Minimal Leather Clutch",
        price: 11000,
        qty: 1,
        quantity: 1,
        size: "OS",
        color: "Tan Leather",
        image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=300&auto=format&fit=crop"
      }
    ],
    returnRequest: {
      reason: "Defective Product",
      comments: "Zipper is stuck and won't glide smoothly.",
      requestedAt: "2026-06-05T09:00:00.000Z",
      approvedAt: "2026-06-06T14:00:00.000Z",
      pickupScheduledDate: "2026-06-17" // Scheduled for tomorrow
    }
  },
  {
    id: "LOFT79102",
    _id: "LOFT79102",
    orderNumber: "LOFT79102",
    status: "Refund Processing",
    orderStatus: "Refund Processing",
    createdAt: "2026-05-28T09:00:00.000Z",
    deliveredAt: "2026-05-30T16:00:00.000Z",
    total: 9200,
    totalAmount: 9200,
    grandTotal: 9200,
    itemsPrice: 9200,
    shippingPrice: 0,
    taxPrice: 0,
    discount: 0,
    paymentMethod: "Razorpay",
    shippingAddress: {
      address: "4A, Heritage Woods, Alipore",
      city: "Kolkata",
      postalCode: "700027",
      country: "India"
    },
    items: [
      {
        product: "p_cashmere_polo",
        name: "Fine Knit Cashmere Polo",
        price: 9200,
        qty: 1,
        quantity: 1,
        size: "M",
        color: "Navy Blue",
        image: "https://images.unsplash.com/photo-1614975058789-41316d0e2e9c?q=80&w=300&auto=format&fit=crop"
      }
    ],
    refundStatus: "Processing",
    refundAmount: 9200,
    refundMethod: "Razorpay (Original Payment Method)",
    refundDate: "2026-06-18", // Est date
    returnRequest: {
      reason: "Damaged Item",
      comments: "Stitching is coming undone on the left shoulder.",
      requestedAt: "2026-06-01T10:00:00.000Z",
      returnedAt: "2026-06-15T11:00:00.000Z"
    }
  },
  {
    id: "LOFT78452",
    _id: "LOFT78452",
    orderNumber: "LOFT78452",
    status: "Refund Processed",
    orderStatus: "Refund Processed",
    createdAt: "2026-05-20T10:00:00.000Z",
    deliveredAt: "2026-05-22T14:30:00.000Z",
    total: 4299,
    totalAmount: 4299,
    grandTotal: 4299,
    itemsPrice: 4299,
    shippingPrice: 0,
    taxPrice: 0,
    discount: 0,
    paymentMethod: "Razorpay",
    shippingAddress: {
      address: "Flat 4B, Heritage Apartments, 12 Park Street",
      city: "Mumbai",
      postalCode: "400016",
      country: "India"
    },
    items: [
      {
        product: "p_silk_blouse",
        name: "LOFT Premium Silk Blouse",
        price: 4299,
        qty: 1,
        quantity: 1,
        size: "M",
        color: "Champagne",
        image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=300&auto=format&fit=crop"
      }
    ],
    refundStatus: "Completed",
    refundAmount: 4299,
    refundMethod: "Razorpay (Ref: RZP_182940283)",
    refundDate: "2026-05-28",
    returnRequest: {
      reason: "Wrong Size",
      comments: "It's too tight around the chest.",
      requestedAt: "2026-05-24T12:00:00.000Z",
      returnedAt: "2026-05-27T10:00:00.000Z"
    }
  }
];
