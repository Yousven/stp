/**
 * Ikoonid.
 *
 * Osa objektil töötavatest inimestest ei loe eesti keelt ja osa ei loe
 * ekraanilt üldse hea meelega — ikoon teksti kõrval annab teise võimaluse
 * õigest nupust aru saada. Joonised on siin failis sees, mitte teegist:
 * paarkümmend ikooni ei ole väärt eraldi sõltuvust, mis tuleks natiivsesse
 * äppi kaasa pakkida.
 *
 * Kõik ikoonid on joonestiilis ja pärivad värvi tekstilt (`currentColor`),
 * seega sobivad nii heledas kui tumedas režiimis.
 */

export type IconName =
  | "play"
  | "stop"
  | "history"
  | "calendar"
  | "building"
  | "users"
  | "userPlus"
  | "chart"
  | "settings"
  | "tag"
  | "briefcase"
  | "report"
  | "euro"
  | "invoice"
  | "card"
  | "logout"
  | "pin"
  | "clock"
  | "check"
  | "alert"
  | "info"
  | "inbox"
  | "building2";

const PATHS: Record<IconName, string> = {
  play: "M8 5.5v13l11-6.5z",
  stop: "M7 7h10v10H7z",
  history: "M4 6h16M4 12h16M4 18h11",
  calendar: "M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z",
  building: "M4 21V6l7-3v18M11 21h9V10l-9-3M14 11h3M14 15h3M7 10h1M7 14h1",
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20a6 6 0 0 1 12 0M17 11a3 3 0 1 0 0-6M18 20a5.5 5.5 0 0 0-2-4.3",
  userPlus: "M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20a7 7 0 0 1 14 0M19 8v6M22 11h-6",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 14a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.5 13H3a2 2 0 1 1 0-4h.2A1.6 1.6 0 0 0 4.3 6.2l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V2a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H22a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.4 1z",
  tag: "M20.6 13.4 12 22l-9-9V4h9l8.6 8.6a1.4 1.4 0 0 1 0 2zM7.5 7.5h.01",
  briefcase: "M9 6V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V6M3 9h18v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9zM3 13h18",
  report: "M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7zM14 3v4h4M9 13h6M9 17h4",
  euro: "M17 6.5A6.5 6.5 0 0 0 7.5 12 6.5 6.5 0 0 0 17 17.5M4 10.5h8M4 13.5h8",
  invoice: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9.5 8h5M9.5 12h5",
  card: "M2 7h20v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1zM2 11h20M6 15h3",
  logout: "M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3M10 16l-4-4 4-4M6 12h11",
  pin: "M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3.5 2",
  check: "M20 6.5 9.5 17 4 11.5",
  alert: "M12 3 2 20h20zM12 10v4M12 17h.01",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01",
  inbox: "M3 13h4l2 3h6l2-3h4M5 5h14l3 8v6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-6z",
  building2: "M6 21V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v16M3 21h18M10 8h1M13 8h1M10 12h1M13 12h1M10.5 21v-4h3v4",
};

interface IconProps {
  name: IconName;
  size?: number;
  /** Täidetud kujund (nt "play") loeb objektil paremini kui õhuke joon. */
  filled?: boolean;
  className?: string;
}

export function Icon({ name, size = 22, filled = false, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      /* Ikoon on kaunistus teksti kõrval — ekraanilugeja peab lugema teksti. */
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
