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

export interface PresenceState {
  onSite: boolean;
  /** Millal praegune kohal/eemal olek algas. */
  since: string;
  /** Viimane seadmelt saadud signaal; null = ainult tööpäeva algus. */
  lastEventAt: string | null;
  /**
   * Objektil viibitud aeg enne praeguse oleku algust (ms). Ekraanil olev
   * kell arvutatakse siit, et see peatuks koos kohalolekuga.
   */
  presentMsBefore: number;
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
  /**
   * Serveri arvates kehtiv kohaloleku olek. Telefon seab siit oma
   * lähteoleku — ilma selleta ei tea esiplaani kontroll esimesel korral,
   * kas olek muutus, ja jätab EXIT-i saatmata.
   */
  presence?: PresenceState;
  /** Kohaloleku põhjal arvutatud netotunnid (lõuna maha arvatud). */
  durationHours?: number | null;
  /** Tööpäeva kogukestus algusest lõpuni, sõltumata kohalolekust. */
  grossHours?: number | null;
  /** Tööpäeva jooksul objektist eemal viibitud aeg. */
  awayHours?: number | null;
  /** Ebausutavalt pikk päev — vajab halduri kontrolli, tunde ei ole muudetud. */
  implausibleLength?: boolean;
}

/**
 * `POST /time-logs/:id/presence-events` vastus.
 *
 * `presence` on serveri LÕPLIK otsus pärast partii salvestamist. Klient ei
 * tohi eeldada, et tema saadetud ENTER läks arvesse: server kontrollib
 * ENTER-i asukoha järgi ja võib selle tagasi lükata.
 */
export interface PresenceEventsResponse {
  accepted: number;
  skipped: number;
  rejected: Array<{ type: string; occurredAt: string; reason: string }>;
  presence: PresenceState;
  log: TimeLog;
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

/**
 * Tänase päeva kokkuvõte.
 *
 * Minutites, mitte tundides: "0,3 h eemal" ei ütle töötajale midagi,
 * "18 min eemal" ütleb. Server liidab kokku kõik tänased tööpäevad, seega
 * objektivahetus ei lõhu numbrit.
 */
export interface TodaySummary {
  /** Objektil viibitud aeg (lõuna sees). */
  presentMinutes: number;
  /** Tööpäeva sees, aga objektist eemal viibitud aeg. */
  awayMinutes: number;
  lunchMinutes: number;
  /** Mitu tööpäeva täna olnud on (objektivahetusel rohkem kui üks). */
  logCount: number;
}

export interface DashboardResponse {
  activeLog: TimeLog | null;
  lastFinished: TimeLog | null;
  monthSummary: MonthSummary;
  today: TodaySummary;
  /** Ootel liitumistaotluste arv (ainult adminile, muidu 0). */
  pendingRequests?: number;
}

/**
 * Kahtlase tegevuse märge. EI blokeeri midagi — tööpäev jääb kehtima ja
 * tunnid arvutatakse edasi. Eesmärk on, et muster oleks nähtav.
 */
export interface SecurityAlert {
  id: number;
  /** "device_mismatch" | "mock_location" | "clock_drift" */
  type: string;
  details: Record<string, unknown>;
  createdAt: string;
  /** Töötaja on märke näinud. */
  seenAt: string | null;
  /** Haldur on juhtumi läbi vaadanud. */
  reviewedAt: string | null;
  timeLogId: number | null;
  /** Ainult halduri vaates. */
  user?: { id: number; username: string };
}

export interface MyAlertsResponse {
  alerts: SecurityAlert[];
  unseen: number;
}

export interface AdminAlertsResponse {
  alerts: SecurityAlert[];
  open: number;
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

export type AbsenceStatus = "pending" | "approved" | "rejected";

export interface Absence {
  id: number;
  userId: number;
  type: AbsenceType;
  /** YYYY-MM-DD, kaasa arvatud. */
  startDate: string;
  endDate: string;
  comment: string | null;
  /**
   * Haldur sisestab kohe `approved`; töötaja taotlus algab `pending`-ina.
   * AINULT `approved` vähendab kuu töötundide normi.
   */
  status: AbsenceStatus;
  decidedAt: string | null;
  /** Halduri põhjendus, eelkõige tagasilükkamisel. */
  decisionComment: string | null;
  user: { id: number; username: string };
}

export interface AbsencesResponse {
  absences: Absence[];
  /** Ootel taotluste arv (adminile kogu ettevõte, töötajale enda omad). */
  pending: number;
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
  /**
   * Päeva pikkus ületab usutava vahetuse. Tunde EI ole muudetud — see on
   * märk, et päev vajab kontrolli (tavaliselt ununes õhtul lõpetamine).
   */
  implausibleLength: boolean;
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

export interface ActiveWorker {
  logId: number;
  userId: number;
  username: string;
  objectId: number;
  objectName: string;
  workTypeName: string | null;
  startTime: string;
  /** Kas töötaja on praegu objektil. Lahkumine peatab kella, aga ei
   *  lõpeta tööpäeva, seega lahtine tööpäev ei tähenda kohalolekut. */
  onSite: boolean;
  presenceSince: string;
  lastPresenceAt: string | null;
  /** Objektil viibitud aeg enne praeguse oleku algust (ms). */
  presentMsBefore: number;
  createdOffline: boolean;
  locationMocked: boolean;
  /** Tööpäev on lahti ununenud: tundide kasv on peatatud, vajab lõpetamist. */
  openLimitReached: boolean;
}

export interface OrgStatus {
  pendingRequests: number;
  active: ActiveWorker[];
}
