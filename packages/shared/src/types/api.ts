export type ApiResponse<T> = {
  data: T;
  message?: string;
};

export type ApiError = {
  error: string;
  message: string;
  statusCode: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type UserRole = "ADMIN" | "OPERATOR" | "VIEWER";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};
