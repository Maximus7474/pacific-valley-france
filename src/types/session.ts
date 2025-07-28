export type SessionParticipantResponse = {
    user: string;
    absent: 0 | 1;
    late: 0 | 1;
    group_emoji: string | null;
    group_acronym: string;
};

export type GroupedParticipants = {
    [key: string]: SessionParticipantResponse[];
    absent: SessionParticipantResponse[];
};