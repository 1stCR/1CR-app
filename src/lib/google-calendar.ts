import { google } from 'googleapis';

// Initialize OAuth2 client
export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI
  );
}

// Get calendar instance
export function getCalendar(accessToken: string) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

interface JobData {
  id: string;
  customer_name: string;
  appliance_type: string;
  address: string;
  scheduled_date: string;
  estimated_duration: number;
}

// Create job event in calendar
export async function createJobEvent(
  accessToken: string,
  job: JobData
) {
  const calendar = getCalendar(accessToken);

  const startTime = new Date(job.scheduled_date);
  const endTime = new Date(startTime.getTime() + job.estimated_duration * 60 * 60 * 1000);

  const event = {
    summary: `${job.customer_name} - ${job.appliance_type}`,
    description: `Job ID: ${job.id}\n\nService call for ${job.appliance_type}`,
    location: job.address,
    start: {
      dateTime: startTime.toISOString(),
      timeZone: 'America/Denver'
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: 'America/Denver'
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 30 },
        { method: 'popup', minutes: 5 }
      ]
    },
    extendedProperties: {
      private: {
        jobId: job.id
      }
    }
  };

  try {
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event
    });

    return response.data.id; // Return event ID
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
}

interface JobUpdates {
  scheduled_date?: string;
  estimated_duration?: number;
  customer_name?: string;
  appliance_type?: string;
  address?: string;
}

// Update existing event
export async function updateJobEvent(
  accessToken: string,
  eventId: string,
  updates: JobUpdates
) {
  const calendar = getCalendar(accessToken);

  // Get existing event
  const { data: existingEvent } = await calendar.events.get({
    calendarId: 'primary',
    eventId: eventId
  });

  // Build update object
  const updatedEvent: any = { ...existingEvent };

  if (updates.customer_name || updates.appliance_type) {
    updatedEvent.summary = `${updates.customer_name || ''} - ${updates.appliance_type || ''}`;
  }

  if (updates.address) {
    updatedEvent.location = updates.address;
  }

  if (updates.scheduled_date) {
    const startTime = new Date(updates.scheduled_date);
    const duration = updates.estimated_duration || 2; // Default 2 hours
    const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);

    updatedEvent.start = {
      dateTime: startTime.toISOString(),
      timeZone: 'America/Denver'
    };
    updatedEvent.end = {
      dateTime: endTime.toISOString(),
      timeZone: 'America/Denver'
    };
  }

  try {
    const response = await calendar.events.update({
      calendarId: 'primary',
      eventId: eventId,
      requestBody: updatedEvent
    });

    return response.data;
  } catch (error) {
    console.error('Error updating calendar event:', error);
    throw error;
  }
}

// Delete event
export async function deleteJobEvent(
  accessToken: string,
  eventId: string
) {
  const calendar = getCalendar(accessToken);

  try {
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId
    });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    throw error;
  }
}

// Get events for date range
export async function getJobsFromCalendar(
  accessToken: string,
  startDate: Date,
  endDate: Date
) {
  const calendar = getCalendar(accessToken);

  try {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });

    return response.data.items || [];
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw error;
  }
}
