"use client";

import { api } from "./api.js";

export async function login(email: string, password: string) {
  const res = await api.post<{ data: { token: string; user: any } }>("/auth/login", { email, password });
  localStorage.setItem("token", res.data.token);
  return res.data.user;
}

export async function register(name: string, email: string, password: string) {
  const res = await api.post<{ data: { token: string; user: any } }>("/auth/register", { name, email, password });
  localStorage.setItem("token", res.data.token);
  return res.data.user;
}

export function logout() {
  localStorage.removeItem("token");
  window.location.href = "/login";
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem("token");
}
