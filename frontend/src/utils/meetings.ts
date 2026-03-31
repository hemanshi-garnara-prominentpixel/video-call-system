export interface Meeting {
  id: string;
  start: string;
  end: string;
}

export const MEETINGS: Record<string, Omit<Meeting, "id">> = {
  abc123: {
    start: new Date(Date.now() + 5 * 60000).toISOString(), // 10 minutes from now (for testing)
    end: new Date(Date.now() + 1 * 60000).toISOString(),
  },
  xyz789: {
    start: new Date(Date.now() + 60 * 60000).toISOString(),
    end: new Date(Date.now() + 120 * 60000).toISOString(),
  },
};

export const EARLY_JOIN_MIN = 5;
