export function getKstDateId(date: Date): string {
    // YYYY-MM-DD in Asia/Seoul
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
    return formatter.format(date);
}

