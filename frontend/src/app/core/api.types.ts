export type Role = 'admin' | 'lider' | 'especialista' | 'gestor' | 'colaborador';
export type MovementType = 'entrada' | 'salida';
export type StockStatus = 'low' | 'ok' | 'high';

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  full_name: string;
  email: string;
  password: string;
  role?: Role;
  is_active?: boolean;
  send_welcome_email?: boolean;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  description: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  max_stock: number;
  is_active: boolean;
  alert_sent: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  stock_status: StockStatus;
}

export interface InventoryItemPayload {
  code: string;
  name: string;
  description: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  max_stock: number;
  is_active: boolean;
}

export interface InventoryMovement {
  id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  movement_type: MovementType;
  quantity: number;
  stock_before: number;
  stock_after: number;
  reason: string;
  notes: string;
  performed_by: string;
  performed_by_name: string;
  created_at: string;
}

export interface MovementPayload {
  item_id?: string | null;
  item_code?: string | null;
  movement_type: MovementType;
  quantity: number;
  reason: string;
  notes: string;
}

export interface MovementResponse {
  ok: boolean;
  message: string;
  movement: InventoryMovement;
  alert_sent: boolean;
}

export interface StockAlert {
  id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  current_stock: number;
  min_stock: number;
  sent_to: string;
  status: string;
  error_message: string;
  created_at: string;
  sent_at: string | null;
}

export interface MessageResponse {
  message: string;
}
