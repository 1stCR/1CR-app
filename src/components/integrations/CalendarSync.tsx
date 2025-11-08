import { useState, useEffect } from 'react';
import { Calendar, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export function CalendarSync() {
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch('/api/integrations/google/status');
      const data = await response.json();
      setConnected(data.connected);
      if (data.lastSync) {
        setLastSync(new Date(data.lastSync));
      }
    } catch (error) {
      console.error('Error checking calendar status:', error);
    }
  };

  const connectCalendar = () => {
    // Redirect to Google OAuth
    window.location.href = '/api/auth/google';
  };

  const syncNow = async () => {
    setSyncing(true);
    try {
      await fetch('/api/integrations/google/sync', { method: 'POST' });
      setLastSync(new Date());
    } catch (error) {
      console.error('Error syncing calendar:', error);
    } finally {
      setSyncing(false);
    }
  };

  const disconnect = async () => {
    if (!confirm('Disconnect Google Calendar? Existing events will not be deleted.')) {
      return;
    }

    try {
      await fetch('/api/integrations/google/disconnect', { method: 'POST' });
      setConnected(false);
      setLastSync(null);
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Calendar className="text-blue-600" size={24} />
          <h3 className="text-lg font-semibold">Google Calendar</h3>
        </div>

        {connected ? (
          <CheckCircle className="text-green-600" size={20} />
        ) : (
          <AlertCircle className="text-gray-400" size={20} />
        )}
      </div>

      {connected ? (
        <div>
          <p className="text-gray-600 mb-4">
            Calendar sync is active. Job schedules will automatically sync to your Google Calendar.
          </p>

          {lastSync && (
            <p className="text-sm text-gray-500 mb-4">
              Last synced: {lastSync.toLocaleString()}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={syncNow}
              disabled={syncing}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>

            <button
              onClick={disconnect}
              className="text-red-600 px-4 py-2 rounded-lg hover:bg-red-50"
            >
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-gray-600 mb-4">
            Connect your Google Calendar to automatically sync job schedules, receive reminders, and manage your day.
          </p>

          <button
            onClick={connectCalendar}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Connect Google Calendar
          </button>
        </div>
      )}
    </div>
  );
}
