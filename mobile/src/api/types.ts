export interface WorkObject {
  id: number;
  name: string;
  description: string | null;
  address: string | null;
  latitude: string;
  longitude: string;
  radius: number;
  deleted: boolean;
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

export interface CostCode {
  id: number;
  objectId: number | null;
  code: string;
  name: string;
  /** Kliendile esitatav tunnihind; null = arveldusmäär määramata. */
  billableRate: string | null;
  deleted: boolean;
}

export interface BillingLine {
  costCode: string;
  hours: number;
  rate: number | null;
  billable: number;
}

export interface BillingObject {
  objectId: number;
  objectName: string;
  clientName: string | null;
  budgetHours: number | null;
  hours: number;
  /** Eelarvet ületavad tunnid; null kui eelarvet pole määratud. */
  overBudgetHours: number | null;
  cost: number;
  billable: number;
  margin: number;
  /** Tunnid ilma arveldusmäärata — need EI ole arvel. */
  unbilledHours: number;
  lines: BillingLine[];
}

export interface BillingResponse {
  objects: BillingObject[];
  totals: { hours: number; cost: number; billable: number; margin: number; unbilledHours: number };
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
