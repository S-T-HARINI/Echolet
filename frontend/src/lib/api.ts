const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const MOCK_BASE = process.env.NEXT_PUBLIC_MOCK_SERVICE_URL || 'http://localhost:8001';

// ---------------- Type Definitions ----------------

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ORGANIZER' | 'MEMBER';
  is_active: boolean;
  created_at?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  message: string;
}

export interface Workshop {
  id: string;
  title: string;
  description?: string;
  schedule: string;
  capacity: number;
  status: 'SCHEDULED' | 'CANCELLED';
  cancelled_at?: string;
  registered_count: number;
  available_capacity: number;
  organizer_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Registration {
  id: string;
  workshop_id: string;
  member_id: string;
  member_name: string;
  member_email: string;
  status: string;
  registered_at: string;
  notification_id?: string;
  notification_status?: string;
}

export interface GlobalRegistrationItem {
  id: string;
  workshop_id: string;
  workshop_title: string;
  workshop_status: string;
  member_id: string;
  member_name: string;
  member_email: string;
  status: string;
  registered_at: string;
}

export interface NotificationOutbox {
  id: string;
  workshop_id: string;
  recipient_email: string;
  recipient_name: string;
  event_type: string;
  payload: Record<string, any>;
  idempotency_key: string;
  status: 'PENDING' | 'CLAIMED' | 'DELIVERED' | 'RETRYING' | 'FAILED';
  attempt_count: number;
  last_error?: string;
  next_retry_at: string;
  claimed_by?: string;
  claim_expires_at?: string;
  delivered_at?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationSummary {
  total: number;
  pending: number;
  claimed: number;
  retrying: number;
  delivered: number;
  failed: number;
}

export interface SimulatorStatus {
  mode: string;
  delay_seconds: number;
  failure_rate: number;
  fail_recipients: string[];
  timeout_recipients: string[];
  total_received: number;
  total_delivered: number;
  total_failed: number;
  total_deduplicated: number;
}

// ---------------- Helper Headers ----------------

function getHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extra || {}),
  };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('echolet_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
}

// ---------------- Authentication APIs ----------------

export async function signup(data: {
  email: string;
  password: string;
  name: string;
  role: 'ORGANIZER' | 'MEMBER';
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/v1/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Sign up failed');
  }
  const result: AuthResponse = await res.json();
  if (typeof window !== 'undefined' && result.token) {
    localStorage.setItem('echolet_token', result.token);
  }
  return result;
}

export async function login(data: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Sign in failed');
  }
  const result: AuthResponse = await res.json();
  if (typeof window !== 'undefined' && result.token) {
    localStorage.setItem('echolet_token', result.token);
  }
  return result;
}

export async function logout(): Promise<{ message: string }> {
  try {
    await fetch(`${API_BASE}/api/v1/auth/logout`, {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'include',
    });
  } catch (err) {
    console.error('Logout error:', err);
  } finally {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('echolet_token');
    }
  }
  return { message: 'Logged out successfully' };
}

export async function fetchMe(): Promise<User | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
      headers: getHeaders(),
      credentials: 'include',
    });
    if (!res.ok) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('echolet_token');
      }
      return null;
    }
    return await res.json();
  } catch {
    return null;
  }
}

// ---------------- Workshop APIs ----------------

export async function fetchWorkshops(status?: string): Promise<Workshop[]> {
  const url = status
    ? `${API_BASE}/api/v1/workshops?status=${status}`
    : `${API_BASE}/api/v1/workshops`;
  const res = await fetch(url, {
    headers: getHeaders(),
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Failed to fetch workshops: ${res.statusText}`);
  }
  return res.json();
}

export async function createWorkshop(data: {
  title: string;
  description?: string;
  schedule: string;
  capacity: number;
}): Promise<Workshop> {
  const res = await fetch(`${API_BASE}/api/v1/workshops`, {
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to create workshop');
  }
  return res.json();
}

export async function cancelWorkshop(workshopId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/v1/workshops/${workshopId}/cancel`, {
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to cancel workshop');
  }
  return res.json();
}

// ---------------- Registration APIs ----------------

export async function registerMember(
  workshopId: string,
  data: { member_id: string; member_name: string; member_email: string }
): Promise<Registration> {
  const res = await fetch(`${API_BASE}/api/v1/workshops/${workshopId}/registrations`, {
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Registration failed');
  }
  return res.json();
}

export async function fetchRegistrations(workshopId: string): Promise<Registration[]> {
  const res = await fetch(`${API_BASE}/api/v1/workshops/${workshopId}/registrations`, {
    headers: getHeaders(),
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Failed to fetch registrations: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchAllRegistrations(workshopId?: string): Promise<GlobalRegistrationItem[]> {
  const url = workshopId
    ? `${API_BASE}/api/v1/registrations?workshop_id=${workshopId}`
    : `${API_BASE}/api/v1/registrations`;
  const res = await fetch(url, {
    headers: getHeaders(),
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Failed to fetch all registrations: ${res.statusText}`);
  }
  return res.json();
}

// ---------------- Notification APIs ----------------

export async function fetchNotificationSummary(): Promise<NotificationSummary> {
  const res = await fetch(`${API_BASE}/api/v1/notifications/summary`, {
    headers: getHeaders(),
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to fetch outbox summary');
  }
  return res.json();
}

export async function fetchNotifications(params?: {
  status?: string;
  recipient_email?: string;
  limit?: number;
}): Promise<{ items: NotificationOutbox[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.status) query.append('status', params.status);
  if (params?.recipient_email) query.append('recipient_email', params.recipient_email);
  if (params?.limit) query.append('limit', params.limit.toString());

  const res = await fetch(`${API_BASE}/api/v1/notifications?${query.toString()}`, {
    headers: getHeaders(),
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to fetch notifications');
  }
  return res.json();
}

// ---------------- Mock Simulator APIs ----------------

export async function fetchSimulatorStatus(): Promise<SimulatorStatus> {
  const res = await fetch(`${MOCK_BASE}/api/v1/simulate/status`);
  if (!res.ok) throw new Error('Failed to fetch simulator status');
  return res.json();
}

export async function configureSimulator(config: {
  mode: string;
  delay_seconds?: number;
  failure_rate?: number;
  fail_recipients?: string[];
}): Promise<SimulatorStatus> {
  const res = await fetch(`${MOCK_BASE}/api/v1/simulate/configure`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error('Failed to configure simulator');
  return res.json();
}

export async function resetSimulator(): Promise<SimulatorStatus> {
  const res = await fetch(`${MOCK_BASE}/api/v1/simulate/reset`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to reset simulator');
  return res.json();
}

// ---------------- Health & Diagnostics APIs ----------------

export async function fetchHealth(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/v1/health`);
  if (!res.ok) throw new Error('Failed to fetch health');
  return res.json();
}
