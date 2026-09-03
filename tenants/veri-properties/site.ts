export const siteContent = {
  hero: {
    subtitle:
      "A modern UK letting agency for landlords and tenants who want clear communication, compliant homes, and reliable day-to-day management.",
  },
  about: {
    summary:
      "Veri Properties is a professional residential letting agency built around transparent fees, well-presented homes, and attentive property management. We support landlords who want their investments looked after properly — and tenants looking for quality rental homes with a straightforward move-in journey.",
    paragraphs: [
      "Letting a property or finding a home is a significant decision. Our team combines local market knowledge with structured processes for marketing, referencing, compliance, rent collection, and maintenance coordination — so nothing important falls through the cracks.",
      "We work with trusted contractors and keep both landlords and tenants informed throughout the tenancy. From first viewing to check-out, you deal with a dedicated team that responds promptly and explains what happens next.",
      "Veri Properties is committed to compliant, well-maintained homes and a letting experience that feels professional without being impersonal. Whether you are placing a single property or building a small portfolio, we aim to make management simple, transparent, and reliable.",
    ],
    highlights: [
      { title: "Transparent fees", description: "Clear pricing for management, marketing, and tenancy services — no surprises." },
      { title: "Compliance led", description: "Safety certificates, deposits, and legislation handled as part of day-to-day management." },
      { title: "Responsive support", description: "A dedicated team for landlords and tenants, with clear reporting and updates." },
      { title: "Quality homes", description: "Well-presented rental properties marketed carefully and maintained throughout the tenancy." },
    ],
  },
  contact: {
    phone: "0161 000 0000",
    email: "info@veri.properties",
    address: {
      line1: "Veri Properties",
      line2: "Suite 2, 18 King Street",
      city: "Manchester",
      postcode: "M2 6AQ",
    },
    hours: [
      { day: "Monday", hours: "09:00 – 17:00" },
      { day: "Tuesday", hours: "09:00 – 17:00" },
      { day: "Wednesday", hours: "09:00 – 17:00" },
      { day: "Thursday", hours: "09:00 – 17:00" },
      { day: "Friday", hours: "09:00 – 17:00" },
    ],
  },
  cmp: {
    scheme: "Property Redress Scheme Client Money Protection",
    certificateUrl: "/documents/cmp-certificate.pdf",
  },
  memberships: [
    "Property Redress Scheme",
    "Client Money Protection (CMP)",
    "National Residential Landlords Association (NRLA)",
  ],
  deposits: {
    note: "All deposits are held in a designated client account in accordance with government regulations and protected with a government-approved tenancy deposit scheme.",
  },
  fees: {
    holdingDepositNote:
      "Holding deposit (max one week's rent) may be taken to reserve a property.",
    tenancyDepositNote:
      "Tenancy deposit capped at five weeks' rent where annual rent is under £50,000.",
    permittedPaymentsUrl:
      "https://www.gov.uk/government/publications/how-to-rent/how-to-rent-the-checklist-for-renting-in-england",
  },
  landlords: {
    hero: {
      eyebrow: "For landlords",
      title: "Full property management with clear fees",
      subtitle:
        "From marketing and referencing to rent collection, repairs, and compliance — we manage your rental property so you do not have to.",
    },
    intro: [
      "Our landlords and lettings team take care of everything involved in managing your property: collecting rent, arranging works, coordinating safety checks, and keeping records up to date. We stay current with the latest rules and regulations so both your property and your tenants are looked after throughout the tenancy.",
      "All of our team are experienced in residential lettings and are positioned to give accurate advice from first enquiry through to end of tenancy.",
      "You can use our management service even if another agent found the tenant or you already have a tenancy in place. If you no longer have the time to manage the property yourself — or you are unhappy with your current agent — we are happy to discuss how we can help.",
      "As standard, we market your property, find a suitable tenant, obtain references, collect the initial rent and deposit on move-in, continue rent collection throughout the tenancy, and manage the day-to-day letting of your property.",
    ],
    services: [
      "Two interim property inspections each year",
      "Out-of-hours emergency contractor coordination",
      "Arrange repairs and maintenance on your behalf",
      "Key holding service",
      "Arrange payment of outgoings (ground rent, service charges) where instructed",
      "Tax information support for overseas landlords",
      "Rent collection throughout the tenancy",
      "Check-in, inventories, check-out and deposit negotiation",
    ],
    contractors:
      "Our lettings team works with vetted contractors at every level — from small independent trades for routine jobs through to larger firms for more complex maintenance and repairs. We coordinate emergency call-outs for tenants out of hours and keep landlords informed before approving significant expenditure.",
    fees: {
      summary:
        "The service we offer is full management. The charge for our services is 10% + VAT of rents collected.",
      items: [
        {
          category: "Management fees",
          fees: [
            {
              label: "Full management",
              amount: "10% + VAT of rents collected",
              note: "Ongoing rent collection and day-to-day management throughout the tenancy.",
            },
            {
              label: "Registration / set-up fee",
              amount: "£180.00 + VAT per property",
              note: "Payable from the first week's or month's rent. Covers viewing, referencing and administration. One-off charge — not charged for every tenancy.",
            },
            {
              label: "Advertising / marketing",
              amount: "£150.00 + VAT per tenancy",
              note: "Website listing, major property portals, office marketing, local contacts and a To Let board where appropriate.",
            },
          ],
        },
        {
          category: "Pre-tenancy fees",
          fees: [
            { label: "EPC arrangement", amount: "£12.00 (inc. VAT)", note: "If required and not provided by landlord." },
            { label: "Gas Safety Certificate arrangement", amount: "£12.00 (inc. VAT)", note: "If required and not provided by landlord." },
            { label: "EICR arrangement", amount: "£18.00 (inc. VAT)", note: "If required and not provided by landlord." },
            { label: "Land registry proof of ownership", amount: "£12.00 (inc. VAT)", note: "If required." },
            { label: "Smoke / CO detector installation", amount: "£12.00 (inc. VAT)", note: "If required." },
            { label: "Local authority licensing application", amount: "£120.00 (inc. VAT) per property", note: "Handled on behalf of the landlord." },
            { label: "Landlord withdrawal (before move-in)", amount: "£180.00 (inc. VAT) per tenancy", note: "Covers marketing and set-up costs if landlord withdraws before tenancy starts." },
          ],
        },
        {
          category: "During tenancy",
          fees: [
            { label: "Additional property visits", amount: "£36.00 (inc. VAT) per visit", note: "Beyond those in your Terms of Business." },
            { label: "Landlord withdrawal (during tenancy)", amount: "£180.00 (inc. VAT) per tenancy", note: "Covers tenant advice, deposit transfer, utility notifications and key return." },
          ],
        },
        {
          category: "End of tenancy",
          fees: [
            { label: "Tenancy dispute fee", amount: "£90.00 (inc. VAT) per tenancy", note: "Preparation and submission of evidence to the deposit scheme." },
            { label: "Court attendance", amount: "£60.00 (inc. VAT) per hour", note: "Where attendance is required." },
          ],
        },
        {
          category: "Other fees",
          fees: [
            { label: "Deposit transfer", amount: "£24.00 (inc. VAT) per deposit", note: "Changes to a protected deposit during a tenancy." },
            { label: "Annual income & expenditure schedule", amount: "£48.00 (inc. VAT) per annum, per property", note: "In addition to landlord statements." },
            { label: "Refurbishment supervision (under £1,500)", amount: "No charge", note: "Organising works on behalf of the landlord." },
            { label: "Refurbishment supervision (over £1,500)", amount: "10% of total costs + VAT", note: "Plumbing, electrical, decoration, furnishings and similar works." },
          ],
        },
      ],
    },
  },
  tenants: {
    hero: {
      eyebrow: "For tenants",
      title: "Quality homes and support throughout your tenancy",
      subtitle:
        "Browse carefully selected rental properties and get clear guidance from viewing through to moving in — and support for the life of your tenancy.",
    },
    trustPoints: [
      { title: "Good quality properties", description: "A curated selection of well-presented homes across the areas we serve." },
      { title: "Fully compliant", description: "Properties let in line with current safety and housing legislation." },
      { title: "Protected deposits", description: "Tenancy deposits held in a designated client account and protected in an approved scheme." },
    ],
    intro:
      "The Veri Properties team works to make the journey from enquiry to move-in as clear as possible. We understand that many applicants need guidance when securing a tenancy — that is why we offer a structured support path for every customer.",
    benefits:
      "Renting today is a positive lifestyle choice. Many people prefer not to have the long-term obligations that come with property ownership. Renting provides flexibility and frees tenants of the responsibility of major property repairs and maintenance.",
    choosingArea: {
      title: "Choosing the area you want to live in",
      intro: "When choosing a location, take the time to consider where you want to live — maybe visit and walk around the area. Consider:",
      points: [
        "Your budget — some areas are more expensive than others",
        "Your commute to work and whether transport links are good",
        "How near friends and family are",
        "Any special interests that need to be catered for in your chosen area",
        "What shopping facilities are nearby",
        "Services important to you — schools, hospitals and similar",
      ],
    },
    findingProperty: {
      title: "Finding the property to live in",
      paragraphs: [
        "Once you have chosen an area, start your property search on our properties page or call our office. Consider how much rent you can pay each month and what type of property you can afford in your chosen area.",
        "Think about how much space you need, the layout you want and any extra requirements such as a garden or parking space. Once you have decided on the location and property type, browse our available properties and contact our office to arrange a viewing.",
      ],
    },
    securingProperty: {
      title: "Securing your new home",
      steps: [
        {
          title: "Reference checking",
          description:
            "We take into account your current and previous housing history, employment status and character references. This normally takes five to ten working days.",
        },
        {
          title: "Application and holding deposit",
          description:
            "Complete our application form with ID, proof of residency and a holding deposit of one week's rent.",
        },
        {
          title: "Deposit and first rent payment",
          description:
            "You will be required to put down a deposit of up to five weeks' rent. If you fail to pay rent, cause damage or breach your contract, the landlord has the right to deduct costs from your deposit.",
        },
      ],
    },
    permittedPayments: [
      "A payment of up to £50 inc. VAT to alter the tenancy agreement, when requested by a tenant, or reasonable costs incurred if higher",
      "Interest at 3% above the Bank of England base rate for late payment of rent (more than 14 days overdue)",
      "A payment of £15 inc. VAT for the replacement of a lost key or security device",
      "Payments associated with early termination of the tenancy when requested by the tenant",
      "Payments to service providers in respect of utilities, communication services, TV licence and council tax",
      "Other payments permitted under appropriate legislation, including damages",
    ],
    livingInHome: {
      title: "Living in your new home",
      intro: "Living in a rental property differs from living in a property of your own. Things to consider include:",
      points: [
        {
          title: "Insurance",
          description:
            "Ensure you are covered not only for your own items but also any potential damage to your landlord's property. Specialist tenants insurance is available for those living in rental properties.",
        },
        {
          title: "Bills",
          description:
            "Our tenancy agreement stipulates who is responsible for which bills. Please read it carefully and understand what you are responsible for.",
        },
        {
          title: "Pets",
          description:
            "Some property owners will not allow pets, so check the situation before you move in.",
        },
      ],
    },
    responsibilities: {
      title: "Your responsibilities as a tenant",
      intro: "As a tenant of Veri Properties there are a number of obligations you must adhere to, including:",
      points: [
        "Payment of rent according to the conditions set out in the tenancy agreement",
        "Payment of council tax as required",
        "Payment of service and utility bills as specified in the tenancy agreement",
        "Payment of your TV licence",
        "Taking proper care of the property and keeping it in a good condition",
      ],
      outro:
        "We provide you with a comprehensive list of your tenancy responsibilities. Read the tenancy agreement carefully before agreeing to the terms. If there is any part you do not understand, speak with a member of our team.",
    },
    confidentiality:
      "You can be assured that all information passed to Veri Properties will be dealt with in a confidential manner.",
  },
};

