export interface WorkObject {
  id: number;
  name: string;
  description: string | null;
  address: string | null;
  latitude: string;
  longitude: string;
  radius: number;
  deleted: boolean;
  /** Tellija, kellele objekti tunnid arveldatakse. */
  clientId: number | null;
  client?: { id: number; name: string } | null;
  /** Objekti üldine kliendihind, kui tööliigil oma hinda pole. */
  billableRate: string | null;
  budgetHours: string | null;
}

export interface PresenceEvent {
  id: number;
  type: "ENTER" | "EXIT";
  occurredAt: string;
  latitude: string | null;
  longitude: string | null;
  accuracy: string | null;
  source: "manual" | "foreground" | "native";
}

export interface TimeLog {
  id: number;
  userId: number;
  objectId: number;
  startTime: string;
  endTime: string | null;
  comment: string | null;
  travelDuration: string | null;
  lunch: string | null;
  object: WorkObject;
  presenceEvents?: PresenceEvent[];
  /** Kohaloleku põhjal arvutatud netotunnid (lõuna maha arvatud). */
  durationHours?: number | null;
  /** Tööpäeva kogukestus algusest lõpuni, sõltumata kohalolekust. */
  grossHours?: number | null;
  /** Tööpäeva jooksul objektist eemal viibitud aeg. */
  awayHours?: number | null;
}

export interface MonthSummary {
  totalHours: number;
  hourlyRate: number;
  advance: number;
  totalEarnings: number;
  netSalary: number;
  monthlyTarget: number;
  progress: number;
}

export interface DashboardResponse {
  activeLog: TimeLog | null;
  lastFinished: TimeLog | null;
  monthSummary: MonthSummary;
  /** Ootel liitumistaotluste arv (ainult adminile, muidu 0). */
  pendingRequests?: number;
}

export interface AuthUser {
  id: number;
  username: string;
  role: "admin" | "employee";
}

export interface AuthOrganization {
  id: number;
  name: string;
  slug: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  organization: AuthOrganization;
}

export interface HistoryResponse {
  logs: TimeLog[];
  totalHours: number;
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  hourlyRate: string;
  advance: string;
  role: "admin" | "employee";
  /** "active" = tavatöötaja; "pending" = ootab liitumise kinnitust. */
  status?: "active" | "pending" | "rejected";
  requestedAt?: string | null;
}

export type AbsenceType = "vacation" | "sick" | "unpaid" | "other";

export interface Absence {
  id: number;
  userId: number;
  type: AbsenceType;
  /** YYYY-MM-DD, kaasa arvatud. */
  startDate: string;
  endDate: string;
  comment: string | null;
  user: { id: number; username: string };
}

export interface WorkType {
  id: number;
  name: string;
  /** Vabatahtlik raamatupidamise kood. */
  code: string | null;
  /** Vaikimisi kliendihind; null = määramata. */
  defaultRate: string | null;
  deleted: boolean;
  /** Objekti päringu puhul seal kehtiv hind. */
  rate?: string | null;
  objectRate?: string | null;
}

/** Üks rida objekti tööliikide seadistamise ekraanil. */
export interface ObjectWorkType {
  workTypeId: number;
  name: string;
  code: string | null;
  defaultRate: string | null;
  enabled: boolean;
  /** Objektipõhine hind; null = kehtib tööliigi vaikehind. */
  rate: string | null;
}

export interface Client {
  id: number;
  name: string;
  registryCode: string | null;
  vatNumber: string | null;
  email: string | null;
  address: string | null;
  paymentTermDays: number;
  vatRate: string;
  notes: string | null;
  _count?: { objects: number; invoices: number };
}

export interface CompanyDetails {
  name: string;
  registryCode: string | null;
  vatNumber: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  iban: string | null;
  defaultVatRate: string;
}

export interface BillingLine {
  objectId: number;
  objectName: string;
  workTypeId: number | null;
  workTypeName: string | null;
  hours: number;
  rate: number | null;
  billable: number;
  cost: number;
}

export interface BillingObject {
  objectId: number;
  objectName: string;
  budgetHours: number | null;
  /** Eelarvet ületavad tunnid; null kui eelarvet pole määratud. */
  overBudgetHours: number | null;
  hours: number;
  cost: number;
  billable: number;
  /** Tunnid ilma tunnihinnata — need EI lähe arvele. */
  unbilledHours: number;
  lines: BillingLine[];
}

export interface BillingClient {
  clientId: number | null;
  clientName: string | null;
  hours: number;
  cost: number;
  billable: number;
  margin: number;
  unbilledHours: number;
  objects: BillingObject[];
}

export interface BillingResponse {
  clients: BillingClient[];
  totals: { hours: number; cost: number; billable: number; margin: number; unbilledHours: number };
}

export type InvoiceStatus = "draft" | "sent" | "paid" | "void";

export interface InvoiceLine {
  id: number;
  objectId: number | null;
  workTypeId: number | null;
  description: string;
  hours: string;
  rate: string;
  amount: string;
}

export interface InvoiceParty {
  name: string;
  registryCode?: string | null;
  vatNumber?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  iban?: string | null;
}

export interface Invoice {
  id: number;
  clientId: number;
  number: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  periodFrom: string;
  periodTo: string;
  vatRate: string;
  subtotal: string;
  vatAmount: string;
  total: string;
  note: string | null;
  client?: { id: number; name: string };
  lines?: InvoiceLine[];
  seller?: InvoiceParty;
  clientDetails?: InvoiceParty;
}

export interface SubscriptionState {
  status: string;
  seats: number;
  pricePerSeat: number;
  monthlyTotal: number;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  billingMode: string;
  active: boolean;
  trialDaysLeft: number | null;
  /** Kas maksete vastuvõtt on serveris seadistatud. */
  stripeAvailable: boolean;
}

export interface OnboardingState {
  organization: { name: string; slug: string };
  hasObject: boolean;
  hasEmployee: boolean;
  hasWorkType: boolean;
  hasTimeLog: boolean;
  /** Kõik alustamiseks vajalikud sammud tehtud (tööliigid ei loe). */
  complete: boolean;
  dismissed: boolean;
}

export interface ReportRow {
  id: number;
  username: string;
  objectName: string;
  startTime: string;
  endTime: string | null;
  grossHours: number | null;
  netHours: number | null;
  awayHours: number | null;
  lunch: number | null;
  earnings: number | null;
  locationMocked: boolean;
  createdOffline: boolean;
  comment: string | null;
}

export interface ReportOvertimeRow {
  username: string;
  regularHours: number;
  overtimeHours: number;
  payableHours: number;
  hourlyRate: number;
  total: number;
}

export interface ReportPreview {
  rows: ReportRow[];
  /** Nimekiri jäi lühemaks kui tulemus — kogusummad on siiski kõigi pealt. */
  truncated: boolean;
  totalRows: number;
  totals: { logs: number; hours: number; earnings: number };
  overtime: ReportOvertimeRow[];
  overtimeRules: { dailyThreshold: number; weeklyThreshold: number; multiplier: number };
}
