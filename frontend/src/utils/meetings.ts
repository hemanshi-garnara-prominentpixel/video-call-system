export interface Meeting {
  id: string;
  start: string;
  end: string;
}

export const MEETINGS: Record<string, Omit<Meeting, "id">> = {
  abc123: {
    start: "2026-04-01T10:00:00+05:30",
    end: "2026-04-01T10:59:00+05:30",
  },
  xyz789: {
    start: new Date(Date.now() + 5 * 60000).toISOString(),
    end: new Date(Date.now() + 120 * 60000).toISOString(),
  },
};

export const EARLY_JOIN_MIN = 5;
