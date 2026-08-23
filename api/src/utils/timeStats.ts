// Port dashboard.php dünaamilise kuu eesmärgi arvutusest: loeb tööpäevad
// (esmaspäev-reede) käesolevast kuust ja korrutab 8 tunniga.
export function monthlyTargetHours(referenceDate: Date = new Date()): number {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();

  let workDays = 0;
  for (let day = 1; day <= lastDay; day++) {
    const dayOfWeek = new Date(year, month, day).getDay(); // 0=Sun..6=Sat
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workDays++;
    }
  }
  return workDays * 8;
}

export function monthRange(referenceDate: Date = new Date()): { start: Date; end: Date } {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const start = new Date(year, month, 1, 0, 0, 0);
  const end = new Date(year, month + 1, 0, 23, 59, 59);
  return { start, end };
}

export function hoursBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / 1000 / 3600;
}
