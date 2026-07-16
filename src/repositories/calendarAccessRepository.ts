import { Pool } from 'pg';

export type EventValidationStatus = 'pending' | 'validated' | 'refused';

export type CalendarDirectoryUser = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
  groupIds: number[];
};

export type CalendarEventMember = CalendarDirectoryUser & {
  validationStatus: EventValidationStatus;
};

export type CalendarEventAccess = {
  eventId: number;
  createdById: number | null;
  members: CalendarEventMember[];
};

export type CalendarEventMetadata = {
  category: 'meeting' | 'activity' | 'ceremony' | 'other';
  service: string | null;
  location: string | null;
  recurrence: {
    frequency: 'none' | 'daily' | 'weekly' | 'monthly';
    interval?: number;
    daysOfWeek?: number[];
    endsOn?: string;
  } | null;
};

export type CalendarRecurringEventSummary = {
  id: number;
  name: string;
  start: string;
  end: string;
};

const pool = new Pool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME ?? 'mairie_360_database',
  user: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'password',
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

let metadataStorageReady: Promise<void> | null = null;

function ensureCalendarEventMetadataStorage(): Promise<void> {
  if (!metadataStorageReady) {
    metadataStorageReady = pool.query(`
      CREATE TABLE IF NOT EXISTS calendar_event_metadata (
        event_id INTEGER PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
        category VARCHAR(32) NOT NULL DEFAULT 'other',
        service VARCHAR(128),
        location TEXT,
        recurrence JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT calendar_event_metadata_category_check
          CHECK (category IN ('meeting', 'activity', 'ceremony', 'other'))
      )
    `).then(() => undefined).catch((error: unknown) => {
      metadataStorageReady = null;
      throw error;
    });
  }

  return metadataStorageReady;
}

type DirectoryUserRow = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  roles: string[] | null;
  group_ids: number[] | null;
};

type EventMemberRow = DirectoryUserRow & {
  event_id: number;
  created_by: number | null;
  validation_status: EventValidationStatus | null;
};

const directoryUserSelection = `
  SELECT
    u.id,
    u.first_name,
    u.last_name,
    u.email,
    COALESCE(
      array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL),
      ARRAY[]::varchar[]
    ) AS roles,
    COALESCE(
      array_agg(DISTINCT gm.group_id) FILTER (WHERE gm.group_id IS NOT NULL),
      ARRAY[]::integer[]
    ) AS group_ids
  FROM users u
  LEFT JOIN user_roles ur ON ur.user_id = u.id
  LEFT JOIN roles r ON r.id = ur.role_id
  LEFT JOIN group_members gm ON gm.user_id = u.id
`;

function mapDirectoryUser(row: DirectoryUserRow): CalendarDirectoryUser {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    roles: row.roles ?? [],
    groupIds: row.group_ids ?? [],
  };
}

export async function getCalendarDirectoryUser(userId: number): Promise<CalendarDirectoryUser | null> {
  const result = await pool.query<DirectoryUserRow>(
    `${directoryUserSelection}
    WHERE u.id = $1 AND COALESCE(u.is_archived, false) = false
    GROUP BY u.id`,
    [userId],
  );

  return result.rows[0] ? mapDirectoryUser(result.rows[0]) : null;
}

export async function listCalendarDirectoryUsers({
  groupIds,
}: {
  groupIds?: number[];
} = {}): Promise<CalendarDirectoryUser[]> {
  const restrictToGroups = Boolean(groupIds?.length);
  const result = await pool.query<DirectoryUserRow>(
    `${directoryUserSelection}
    WHERE COALESCE(u.is_archived, false) = false
      AND ($1::boolean = false OR EXISTS (
        SELECT 1
        FROM group_members scoped_membership
        WHERE scoped_membership.user_id = u.id
          AND scoped_membership.group_id = ANY($2::integer[])
      ))
    GROUP BY u.id
    ORDER BY u.last_name, u.first_name, u.id`,
    [restrictToGroups, groupIds ?? []],
  );

  return result.rows.map(mapDirectoryUser);
}

export async function filterAssignedCalendarEventIds(
  eventIds: number[],
  userId: number,
): Promise<Set<number>> {
  if (eventIds.length === 0) {
    return new Set();
  }

  const result = await pool.query<{ event_id: number }>(
    `SELECT event_id
     FROM event_members
     WHERE user_id = $1 AND event_id = ANY($2::integer[])`,
    [userId, eventIds],
  );

  return new Set(result.rows.map((row) => row.event_id));
}

export async function getCalendarEventAccess(eventId: number): Promise<CalendarEventAccess | null> {
  const result = await pool.query<EventMemberRow>(
    `SELECT
       e.id AS event_id,
       e.created_by,
       u.id,
       u.first_name,
       u.last_name,
       u.email,
       em.validation_status,
       COALESCE(
         array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL),
         ARRAY[]::varchar[]
       ) AS roles,
       COALESCE(
         array_agg(DISTINCT gm.group_id) FILTER (WHERE gm.group_id IS NOT NULL),
         ARRAY[]::integer[]
       ) AS group_ids
     FROM events e
     LEFT JOIN event_members em ON em.event_id = e.id
     LEFT JOIN users u ON u.id = em.user_id
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     LEFT JOIN group_members gm ON gm.user_id = u.id
     WHERE e.id = $1
     GROUP BY e.id, e.created_by, u.id, em.validation_status
     ORDER BY u.last_name, u.first_name, u.id`,
    [eventId],
  );

  const firstRow = result.rows[0];
  if (!firstRow) {
    return null;
  }

  const members = result.rows.flatMap((row): CalendarEventMember[] => {
    if (!row.id || !row.validation_status) {
      return [];
    }

    return [{
      ...mapDirectoryUser(row),
      validationStatus: row.validation_status,
    }];
  });

  return {
    eventId: firstRow.event_id,
    createdById: firstRow.created_by,
    members,
  };
}

export async function setCalendarEventValidationStatus(
  eventId: number,
  status: EventValidationStatus,
): Promise<void> {
  await pool.query(
    `UPDATE event_members
     SET validation_status = $1
     WHERE event_id = $2`,
    [status, eventId],
  );
}

export async function updateCalendarEventDetails(
  eventId: number,
  input: {
    name: string;
    description: string | null;
    startDate: string;
    endDate: string;
    visibility: 'public' | 'private';
  },
): Promise<boolean> {
  const result = await pool.query(
    `UPDATE events
     SET
       name = $1,
       description = $2,
       start_date = $3::timestamptz,
       end_date = $4::timestamptz,
       visibility = $5::event_visibility
     WHERE id = $6`,
    [
      input.name,
      input.description,
      input.startDate,
      input.endDate,
      input.visibility,
      eventId,
    ],
  );

  return result.rowCount === 1;
}

export async function getCalendarEventMetadata(
  eventId: number,
): Promise<CalendarEventMetadata | null> {
  await ensureCalendarEventMetadataStorage();
  const result = await pool.query<CalendarEventMetadata>(
    `SELECT category, service, location, recurrence
     FROM calendar_event_metadata
     WHERE event_id = $1`,
    [eventId],
  );

  return result.rows[0] ?? null;
}

export async function upsertCalendarEventMetadata(
  eventId: number,
  metadata: CalendarEventMetadata,
): Promise<void> {
  await ensureCalendarEventMetadataStorage();
  await pool.query(
    `INSERT INTO calendar_event_metadata (
       event_id,
       category,
       service,
       location,
       recurrence
     ) VALUES ($1, $2, $3, $4, $5::jsonb)
     ON CONFLICT (event_id) DO UPDATE SET
       category = EXCLUDED.category,
       service = EXCLUDED.service,
       location = EXCLUDED.location,
       recurrence = EXCLUDED.recurrence,
       updated_at = NOW()`,
    [
      eventId,
      metadata.category,
      metadata.service,
      metadata.location,
      metadata.recurrence ? JSON.stringify(metadata.recurrence) : null,
    ],
  );
}

export async function listAssignedRecurringCalendarEvents(
  userId: number,
  from: string,
  to: string,
): Promise<CalendarRecurringEventSummary[]> {
  await ensureCalendarEventMetadataStorage();
  const result = await pool.query<CalendarRecurringEventSummary>(
    `SELECT
       e.id,
       e.name,
       e.start_date::text AS start,
       e.end_date::text AS end
     FROM events e
     JOIN event_members em ON em.event_id = e.id AND em.user_id = $1
     JOIN calendar_event_metadata metadata ON metadata.event_id = e.id
     WHERE metadata.recurrence->>'frequency' IN ('daily', 'weekly', 'monthly')
       AND e.start_date::date <= $3::date
       AND (
         NULLIF(metadata.recurrence->>'endsOn', '') IS NULL
         OR CASE
           WHEN metadata.recurrence->>'endsOn' ~ '^\\d{4}-\\d{2}-\\d{2}$'
             THEN to_date(metadata.recurrence->>'endsOn', 'YYYY-MM-DD')
           WHEN metadata.recurrence->>'endsOn' ~ '^\\d{2}-\\d{2}-\\d{4}$'
             THEN to_date(metadata.recurrence->>'endsOn', 'DD-MM-YYYY')
           ELSE e.start_date::date
         END >= $2::date
       )
     ORDER BY e.start_date, e.id`,
    [userId, from, to],
  );

  return result.rows;
}
