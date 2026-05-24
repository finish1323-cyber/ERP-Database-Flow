import { getAuthToken } from "./auth";

const BASE = import.meta.env.BASE_URL;

function authHeaders() {
  const token = getAuthToken();
  return {
    "content-type": "application/json",
    accept: "application/json",
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}api${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers as Record<string, string> | undefined) },
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const d = await res.json(); msg = d.message || d.error || msg; } catch { /* */ }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

// Company Profile
export interface CompanyProfile {
  id: number;
  name: string;
  activity: string | null;
  address: string | null;
  phone: string | null;
  commercialReg: string | null;
  taxId: string | null;
  currency: string;
  logoData: string | null;
  defaultSafetyLevel: number;
  updatedAt: string;
}

export const getCompanyProfile = () => apiFetch<CompanyProfile>("/company-profile");
export const updateCompanyProfile = (data: Partial<CompanyProfile>) =>
  apiFetch<CompanyProfile>("/company-profile", { method: "PUT", body: JSON.stringify(data) });

// Employees
export interface Employee {
  id: number;
  name: string;
  email: string;
  role: "admin" | "purchasing" | "sales" | "warehouse";
  jobTitle: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateEmployeeInput {
  name: string;
  email: string;
  password: string;
  role: string;
  jobTitle?: string;
}

export const listEmployees = () => apiFetch<Employee[]>("/employees");
export const createEmployee = (data: CreateEmployeeInput) =>
  apiFetch<Employee>("/employees", { method: "POST", body: JSON.stringify(data) });
export const updateEmployee = (id: number, data: Partial<CreateEmployeeInput & { isActive: boolean }>) =>
  apiFetch<Employee>(`/employees/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const toggleEmployee = (id: number) =>
  apiFetch<Employee>(`/employees/${id}/toggle`, { method: "POST" });
export const deleteEmployee = (id: number) =>
  fetch(`${BASE}api/employees/${id}`, { method: "DELETE", headers: authHeaders() });

// Audit Log
export interface AuditEntry {
  id: number;
  employeeId: number | null;
  employeeName: string;
  action: "create" | "update" | "delete";
  entity: string;
  entityId: string | null;
  details: string | null;
  createdAt: string;
}

export const listAuditLog = (limit = 100) =>
  apiFetch<AuditEntry[]>(`/audit-log?limit=${limit}`);

// Backup
export function downloadBackup() {
  const token = getAuthToken();
  const url = `${BASE}api/backup`;
  const a = document.createElement("a");
  a.href = url;
  a.download = "";
  // We need auth header — fetch then create blob URL
  fetch(url, { headers: authHeaders() })
    .then((res) => res.blob())
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      a.href = blobUrl;
      a.download = `erp-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    })
    .catch((err) => {
      console.error("Backup failed:", err);
    });
  void token;
}
