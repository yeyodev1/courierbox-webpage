import { useAuthStore } from "../stores/auth.store";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8100/api";

const handleResponse = async (res: Response) => {
  if (res.status === 401) {
    const authStore = useAuthStore();
    authStore.logout();
    throw new Error("Sesión expirada. Por favor, inicia sesión nuevamente.");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Operation failed");
  }
  return res.json();
};

export const adminApi = {
  async login(email: string, password: string) {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    return handleResponse(res);
  },

  async getPayments() {
    const authStore = useAuthStore();
    const res = await fetch(`${API_BASE_URL}/payments`, {
      headers: {
        Authorization: `Bearer ${authStore.token}`,
      },
    });

    return handleResponse(res);
  },

  async generateLink(payload: {
    amount: number;
    amountWithoutTax: number;
    amountWithTax: number;
    tax: number;
    reference: string;
    customerEmail?: string;
    customerName?: string;
  }) {
    const authStore = useAuthStore();
    const res = await fetch(`${API_BASE_URL}/payments/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authStore.token}`,
      },
      body: JSON.stringify(payload),
    });

    return handleResponse(res);
  },

  async deletePayment(id: string) {
    const authStore = useAuthStore();
    const res = await fetch(`${API_BASE_URL}/payments/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${authStore.token}`,
      },
    });

    return handleResponse(res);
  },

  async getUsers() {
    const authStore = useAuthStore();
    const res = await fetch(`${API_BASE_URL}/users`, {
      headers: {
        Authorization: `Bearer ${authStore.token}`,
      },
    });

    return handleResponse(res);
  },

  async createUser(payload: { email: string; password?: string; name: string; role?: string }) {
    const authStore = useAuthStore();
    const res = await fetch(`${API_BASE_URL}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authStore.token}`,
      },
      body: JSON.stringify(payload),
    });

    return handleResponse(res);
  },

  async updateUser(id: string, payload: { email?: string; password?: string; name?: string; role?: string }) {
    const authStore = useAuthStore();
    const res = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authStore.token}`,
      },
      body: JSON.stringify(payload),
    });

    return handleResponse(res);
  },

  async deleteUser(id: string) {
    const authStore = useAuthStore();
    const res = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${authStore.token}`,
      },
    });

    return handleResponse(res);
  },
};
