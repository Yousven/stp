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
  durationHours?: number | null;
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
}
