import type { Dictionary } from "./et";

export const en: Dictionary = {
  common: {
    back: "Back",
    backToDashboard: "Back to dashboard",
    save: "Save",
    add: "Add",
    cancel: "Cancel",
    edit: "Edit",
    remove: "Remove",
    delete: "Delete",
    loading: "Loading...",
    pleaseWait: "Please wait...",
    saving: "Saving...",
    close: "Close",
    ok: "Got it",
    show: "Show",
    optional: "optional",
    undefinedValue: "Not set",
    allObjects: "All sites",
    object: "Site",
    from: "From",
    to: "To",
    comment: "Comment",
    hours: "hours",
    hoursShort: "h",
    days: "d",
    loadFailed: "Could not load data.",
    saveFailed: "Could not save.",
    deleteFailed: "Could not delete.",
  },

  language: {
    label: "Language",
    et: "Eesti",
    en: "English",
    ru: "Русский",
    uk: "Українська",
  },

  login: {
    appName: "SmartTimePlanning",
    title: "Sign in",
    orgCode: "Company code",
    username: "Username",
    password: "Password",
    submit: "Sign in",
    forgotPassword: "Forgot your password?",
    joinCompany: "Join a company",
    registerCompany: "Register your company",
    failed: "Sign-in failed.",
    logout: "Sign out",
  },

  dashboard: {
    greeting: (name: string) => `Hello, ${name}!`,
    awayFromSite: (meters: number) =>
      `You are ${meters} m away from the site — time tracking is paused. The clock resumes when you return.`,
    offlinePending: (count: number) =>
      `${count} saved action${count > 1 ? "s" : ""} waiting for a connection. They will be sent automatically once you are back online.`,
    offlineRejected: "Some saved actions could not be sent:",
    offlineNotice:
      "No connection. Showing data saved on this phone; your work will be sent once the connection returns.",
    pendingRequests: (count: number) => `${count} new join request${count > 1 ? "s" : ""}`,
    pendingRequestsTail: "waiting for approval — tap here.",
    tapHere: "Tap here.",
    notReadyTitle: "Your company is not ready yet.",
    notReadyObject: "Add your first site — without one, nobody can start a workday.",
    notReadyEmployee: "Bring your workers into the system.",
    notReadyTimeLog: "Try a workday yourself.",
    backgroundPrompt:
      "Allow location in the background and leaving or returning to the site is recorded even when the app is " +
      "closed. Your location is not tracked continuously — only when you cross the site boundary — so it uses " +
      "almost no battery.",
    enableBackground: "Allow in background",
    workdayOpen: "Workday open",
    workdayOpenAway: "Workday open (away from site)",
    clockedIn: "Clocked in",
    noActiveWorkday: "No workday in progress",
    since: "Since",
    lastFinished: "Last completed workday:",
    started: "Started",
    ended: "Ended",
    monthSummary: "This month",
    hoursWorked: "Hours",
    hourlyRate: "Hourly rate",
    earned: "Earned",
    netSalary: "Net pay",
    target: (hours: number, progress: number) => `Target: ${hours} hours (${progress}%)`,
    startWork: "Start workday",
    endWork: "End workday",
    history: "Work history",
    absences: "Absences",
    manageObjects: "Manage sites",
    manageUsers: "Manage users",
    joinRequests: "Join requests",
    teamOverview: "Team overview",
    settings: "Settings",
    costCodes: "Cost codes",
    reports: "Reports",
    billing: "Billing",
    subscription: "Subscription",
  },

  startWork: {
    title: "Start workday",
    workType: "Type of work",
    hint: "A workday can only be started on site — your location is verified.",
    checkingLocation: "Checking location...",
    registering: "Starting workday...",
    locationRequired:
      "Starting a workday requires location permission so we can confirm you are on site. Allow location access " +
      "in settings and try again.",
    locationUnavailable:
      "Could not determine your location. Indoors or without signal, GPS takes time — step outside if you can and " +
      "try again.",
    objectsLoadFailed: "Could not load sites.",
    failed: "Could not start the workday.",
    savedOffline: "Saved offline",
    savedOfflineBody:
      "There was no connection, but the start of your workday is saved on this phone with the current time and " +
      "location. It will be sent automatically once you are back online — you do not need to do anything.",
    queueLabel: (objectName: string) => `Start of workday (${objectName})`,
  },

  endWork: {
    title: "End workday",
    travelDuration: "Travel time (hours)",
    lunch: "Lunch break (hours)",
    submit: "End workday",
    noActiveLog: "No workday in progress. Nothing to end.",
    failed: "Could not end the workday.",
    savedOffline: "Saved offline",
    savedOfflineBody:
      "There was no connection, but the end of your workday is saved on this phone with the current time. It will " +
      "be sent automatically once you are back online.",
    queueLabel: "End of workday",
  },

  absences: {
    title: "Absences",
    employeeIntro:
      "These are your absences. An absence lowers your monthly hours target, so a week of holiday no longer shows " +
      "as a shortfall.",
    employee: "Worker",
    type: "Type",
    start: "Start",
    end: "End (inclusive)",
    submit: "Add absence",
    none: "No absences recorded.",
    loadFailed: "Could not load absences.",
    addFailed: "Could not add the absence.",
    usersLoadFailed: "Could not load users.",
    confirmDelete: (name: string, from: string, to: string) => `Delete ${name}'s absence ${from} – ${to}?`,
    types: {
      vacation: "Holiday",
      sick: "Sick leave",
      unpaid: "Unpaid leave",
      other: "Other",
    },
  },

  costCodes: {
    title: "Cost codes",
    intro:
      "A cost code says what the hours went into (masonry, cleaning, and so on). The billable rate is the hourly " +
      "price charged to the client and it overrides the site rate. Without a rate, the hours stay unbilled in the " +
      "billing report.",
    code: "Code",
    name: "Name",
    billableRate: "Billable rate (€/h)",
    ratePlaceholder: "not set",
    rateUndefined: "Billable rate not set",
    rateValue: (rate: string) => `Billable rate: €${rate}/h`,
    submitNew: "Add cost code",
    none: "No cost codes yet. Without them, every hour lands in the same bucket.",
    loadFailed: "Could not load cost codes.",
    removeFailed: "Could not remove.",
    confirmRemove: (code: string) => `Retire cost code ${code}?`,
  },

  billing: {
    title: "Billing",
    intro:
      "The same hours as payroll, seen from the other end: what the site cost you and what you can charge the " +
      "client. The difference is your margin.",
    calculating: "Calculating...",
    total: "Total",
    hours: "Hours",
    cost: "Cost",
    billable: "Billable",
    margin: "Margin",
    client: (name: string) => `Client: ${name}`,
    budget: (hours: number) => `Budget: ${hours} h`,
    overBudget: (hours: number) => ` — over by ${hours} h`,
    unbilledWarning: (hours: number) =>
      `${hours} hours have no billable rate and are NOT included above. Set a rate on the site or the cost code, ` +
      `or that money goes uninvoiced.`,
    unbilledShort: (hours: number) => `${hours} h with no billable rate`,
    noData: "No completed workdays in the selected period.",
    showLines: "Show by cost code",
    hideLines: "Hide cost codes",
    rateUndefined: "not set",
    loadFailed: "Could not load billing data.",
  },

  subscription: {
    title: "Subscription",
    seats: "Seats",
    pricePerSeat: "Price / seat",
    monthlyTotal: "Monthly",
    periodEnds: "Period ends",
    seatsExplanation:
      "A seat is every active user, including admins. Pending and rejected join requests do not count. The monthly " +
      "total changes automatically when you add or remove a user.",
    trialEnds: (date: string, days: number) => `Trial ends ${date} — ${days} days left.`,
    pastDue:
      "The last payment failed. The app keeps working — nobody should lose their hours over a payment — but please " +
      "update your payment method.",
    inactive: "The subscription is not active. Time tracking is paused until it is restored.",
    checkout: "Start subscription",
    portal: "Manage subscription and invoices",
    opening: "Opening...",
    notConfigured: "Payments are not set up yet. Please contact Nutisemud.",
    openFailed: "Could not open Stripe.",
    loadFailed: "Could not load subscription details.",
    statuses: {
      trialing: "Trial",
      active: "Active",
      past_due: "Payment overdue",
      canceled: "Cancelled",
      unpaid: "Unpaid",
    },
  },

  onboarding: {
    title: "Let's get started",
    welcome: (org: string) => `Welcome, ${org}! Four steps and you are ready to go.`,
    stepsLeft: (count: number) => ` ${count} steps to go.`,
    allDone: " All the essential steps are done.",
    orgCode: "Company code",
    orgCodeExplanation:
      "Every worker needs this code to sign in and to request access. Share it with your team.",
    copyCode: "Copy code",
    copied: "Copied",
    goToDashboard: "Go to dashboard",
    dismiss: "Don't show this again",
    loadFailed: "Could not load setup status.",
    stepObject: {
      title: "Add your first site",
      body:
        "A site is a location with a radius. A workday can only be started inside that radius — that is the check " +
        "that the hours were worked in the right place.",
      action: "Add site",
    },
    stepEmployee: {
      title: "Bring your workers in",
      body:
        "Two ways: add the user yourself, or give the worker your company code — they create an account and you " +
        "approve the request. The code alone grants no access.",
      action: "Add user",
    },
    stepCostCode: {
      title: "Cost codes for client billing",
      body:
        "If you want to invoice clients later, define the types of work and their hourly prices. Without them the " +
        "hours are still recorded, just without a rate in the billing report.",
      action: "Add cost code",
    },
    stepTimeLog: {
      title: "Try starting a workday",
      body:
        "Go to the site and start a workday. You will see exactly what your workers see and can check that the " +
        "radius is the right size.",
      action: "Start workday",
    },
  },

  history: {
    title: "Work history",
    total: (hours: number) => `Total: ${hours} hours`,
    active: "In progress",
    awayFromSite: (hours: number) => `Away from site: ${hours} h`,
    none: "No work records found.",
    loadFailed: "Could not load work history.",
  },

  settings: {
    title: "Admin settings",
    saved: "Settings saved.",
    checkInDeadline: "Check-in deadline",
    checkOutDeadline: "Check-out deadline",
    tolerance: "Tolerance (metres)",
    adminEmail: "Admin email address",
    submit: "Save settings",
    loadFailed: "Could not load settings.",
  },

  reports: {
    title: "Reports",
    worker: "Worker",
    allWorkers: "All workers",
    dateFrom: "Date from",
    dateTo: "Date to",
    downloadExcel: "Download Excel",
    downloadPdf: "Download PDF",
  },

  teamPerformance: {
    title: "Team hours this month",
    totalHours: "Total hours:",
    ofHours: (actual: number, norm: number) => `${actual} / ${norm} hours`,
    none: "No users yet.",
  },

  roles: {
    admin: "admin",
    employee: "worker",
  },

  passwordPolicy: "At least 12 characters, including a number and a symbol.",
  passwordsDoNotMatch: "Passwords do not match.",
  confirmPassword: "Confirm password",

  adminUsers: {
    title: "Users",
    addUser: "Add user",
    hourlyRate: (rate: string) => `Hourly rate: €${rate}`,
    loadFailed: "Could not load users.",
  },

  adminObjects: {
    title: "Sites",
    addObject: "Add site",
    deactivated: "(deactivated)",
    activate: "Activate",
    deactivate: "Deactivate",
    none: "No sites added yet.",
    loadFailed: "Could not load sites.",
    toggleFailed: "Could not change the site.",
  },

  objectForm: {
    titleNew: "Add site",
    titleEdit: "Edit site",
    name: "Site name",
    address: "Address",
    addressPlaceholder: "Start typing an address...",
    addressHint: "Pick an address from the list or fine-tune the location on the map.",
    latitude: "Latitude",
    longitude: "Longitude",
    description: "Description",
    radius: "Allowed radius (m)",
    notFound: "Site not found.",
    loadFailed: "Could not load the site.",
    saveFailed: "Could not save the site.",
  },

  userForm: {
    titleNew: "Add user",
    titleEdit: "Edit user",
    email: "Email",
    hourlyRate: "Hourly rate",
    advance: "Advance",
    role: "Role",
    notFound: "User not found.",
    loadFailed: "Could not load the user.",
  },

  pendingRequests: {
    title: "Join requests",
    none: "No pending requests.",
    requestedAt: (when: string) => `Requested: ${when}`,
    hourlyRatePlaceholder: "e.g. 14.50",
    approve: "Approve",
    reject: "Reject",
    rateRequired: (name: string) => `Set an hourly rate for ${name} before approving.`,
    approveFailed: "Could not approve.",
    rejectFailed: "Could not reject.",
    loadFailed: "Could not load requests.",
  },

  requestAccess: {
    title: "Join a company",
    intro: "Create your account. The company administrator has to approve it.",
    orgCodeHint: "Ask your employer for this code.",
    submit: "Send join request",
    sending: "Sending...",
    backToLogin: "Back to sign-in",
    afterApproval: "Once the administrator approves your request, you can sign in with the same details.",
    usernameLabel: "Username:",
    sentTitle: "Request sent",
    company: "Company:",
    failed: "Could not send the request.",
  },

  registerOrg: {
    title: "Register a company",
    intro: "Creates a new company and its first admin user.",
    orgName: "Company name",
    orgSlugHint: "Used when signing in. Lower-case letters, numbers, hyphens.",
    adminUsername: "Admin username",
    adminEmail: "Admin email",
    submit: "Register",
    failed: "Registration failed.",
  },

  forgotPassword: {
    title: "Forgot your password?",
    intro: "We will email you a reset link.",
    submit: "Send reset link",
    sending: "Sending...",
    checkEmailTitle: "Check your email",
    checkEmailBody:
      "If such an account exists, we have emailed the reset instructions. The link is valid for one hour.",
    failed: "Could not send the request.",
  },

  resetPassword: {
    title: "Set a new password",
    newPassword: "New password",
    submit: "Save new password",
    invalidTitle: "Invalid link",
    invalidBody: "The link does not contain a reset code. Please request a new one.",
    requestNewLink: "Request a new link",
    doneTitle: "Password updated",
    doneBody: "Your password has been changed and all earlier sessions ended. Sign in with the new password.",
    failed: "Could not update the password.",
  },
};
