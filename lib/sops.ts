export const SOPS = {
  CREATE_QUOTE: {
    code: 'SOP-001',
    title: 'Create a New Quote',
    purpose: 'To establish a standardized process for creating and approving customer quotations in the WebApp.',
    scope: 'Applies to all users authorized to issue or edit quotations.',
    procedure: [
      'Navigate → Projects → Quotes → New Quote.',
      'Enter Quote Header:\n  • Customer name\n  • Opportunity name / project title\n  • Expected close date\n  • Payment terms',
      'Add Deliverables:\n  • Click Add Deliverable\n  • Enter title, type (Equipment, Service, Materials), and price',
      'Add Labor Estimates:\n  • Select phase codes (e.g., ME020 Mechanical Design, SW040 Software)\n  • Enter role, planned hours, and bill rate',
      'Add Billing Milestones:\n  • Define up to four stages (e.g., PO, Design Approval, FAT, SAT)\n  • Assign percentages totaling 100%',
      'Review & Save:\n  • Confirm totals and currency\n  • Save as Draft or Proposed'
    ],
    verification: [
      'Quote total matches sum of deliverables.',
      'All milestones have correct percentages.',
      'Status updates appear on the quote dashboard.'
    ]
  },
  CONVERT_QUOTE: {
    code: 'SOP-002',
    title: 'Convert a Quote to a Job',
    purpose: 'To initiate an active project for execution and real-time tracking.',
    procedure: [
      'From Quotes, open an Approved quote.',
      'Click Convert to Job.',
      'Verify copied data:\n  • Deliverables\n  • Labor estimates\n  • Billing milestones',
      'Assign:\n  • Project Manager\n  • Target start and end dates\n  • Internal job number',
      'Click Create Job.'
    ],
    verification: [
      'Job appears in Active Jobs.',
      'Contract value matches quote total.'
    ]
  },
  ADD_EMPLOYEE: {
    code: 'SOP-003',
    title: 'Add a New Employee',
    purpose: 'To ensure consistent setup of employees for time tracking and labor costing.',
    procedure: [
      'Navigate → Admin → Employees → Add New.',
      'Enter Details:\n  • Full name\n  • Role (e.g., Controls Engineer)\n  • Default hourly rate\n  • Email/login credentials',
      'Assign Permissions:\n  • Select departments and system access (Time Entry, Job View, etc.)',
      'Save Record.'
    ],
    verification: [
      'Employee appears in employee list.',
      'Default rate loads automatically when creating a time entry.'
    ]
  },
  ADD_TIME_ENTRY: {
    code: 'SOP-004',
    title: 'Add a Time Entry',
    purpose: 'To record labor hours accurately against jobs and phases.',
    procedure: [
      'Navigate → Time → Add Entry.',
      'Select:\n  • Employee (auto-filled if logged in)\n  • Job ID\n  • Phase code (e.g., SW040 Software)\n  • Work date',
      'Enter Hours Worked and optional notes.',
      'Save Entry.'
    ],
    verification: [
      'Entry appears in employee\'s timesheet and job ledger.',
      'Job dashboard updates actual hours in real time.'
    ]
  },
  VALIDATE_TRACKING: {
    code: 'SOP-005',
    title: 'Validate Planned vs. Actual Tracking',
    purpose: 'To confirm that real-time tracking, variance, and cost analytics function correctly.',
    procedure: [
      'Open Job → Labor Summary.',
      'Review each phase:\n  • Planned hours (from quote)\n  • Actual hours (from time entries)\n  • Variance and % used',
      'Add or edit a time entry while viewing the dashboard.',
      'Confirm refresh or live update occurs.'
    ],
    verification: [
      'Variance and % used update immediately.',
      'Phase totals equal the sum of all related time entries.',
      'No rounding or rate discrepancies.'
    ]
  },
  BILLING_MILESTONE: {
    code: 'SOP-006',
    title: 'Billing Milestone Review',
    purpose: 'To verify billing triggers and revenue recognition logic.',
    procedure: [
      'Navigate to Job → Billing → Milestones.',
      'Mark a milestone as "Complete."',
      'Confirm invoice record creation or AR status update.'
    ],
    verification: [
      'Milestone percentage and amount match contract total.',
      'Billing history shows date and user who completed milestone.'
    ]
  },
  ADD_CUSTOMER: {
    code: 'SOP-007',
    title: 'Add a New Customer',
    purpose: 'To ensure consistent setup of customer accounts for project tracking and billing.',
    procedure: [
      'Navigate → Admin → Customer Management → Add Customer.',
      'Enter Customer Details:\n  • Customer name (company name)\n  • Email address\n  • Phone number\n  • Physical address',
      'Set Status:\n  • Check "Active Customer" for current clients\n  • Uncheck for inactive or archived accounts',
      'Click Create Customer.'
    ],
    verification: [
      'Customer appears in customer list.',
      'Customer is available for selection when creating new jobs or quotes.',
      'Contact information is correctly displayed.'
    ]
  }
} as const

