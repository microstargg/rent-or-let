export type PropertyStatus = "draft" | "available" | "let_agreed" | "archived";
export type PropertyType =
  | "terraced"
  | "semi_detached"
  | "detached"
  | "flat"
  | "bungalow"
  | "commercial";
export type FurnishedType = "furnished" | "unfurnished" | "part_furnished";
export type PortalName = "rightmove" | "onthemarket" | "zoopla" | "website";
export type SyncStatus = "pending" | "success" | "failed" | "skipped";
export type EnquiryStatus = "new" | "in_progress" | "closed";
export type ApplicationStatus =
  | "submitted"
  | "reviewing"
  | "approved"
  | "rejected";
export type ComplaintStatus = "open" | "investigating" | "resolved" | "closed";
export type ComplaintPriority = "low" | "medium" | "high";

export interface PortalSyncState {
  external_id?: string;
  last_synced_at?: string;
  status?: SyncStatus;
  error?: string;
}

export interface Property {
  id: string;
  branch_id: string;
  agent_ref: string;
  slug: string;
  display_address: string;
  house_name_number: string;
  street: string;
  town: string;
  postcode: string;
  price_pcm: number;
  deposit: number;
  holding_deposit?: number;
  available_from: string;
  bedrooms: number;
  bathrooms: number;
  property_type: PropertyType;
  furnished: FurnishedType;
  status: PropertyStatus;
  description: string;
  summary?: string;
  features: string[];
  permitted_payments?: string[];
  epc_rating?: string;
  virtual_tour_url?: string;
  floorplan_url?: string;
  epc_url?: string;
  portal_sync: Record<string, PortalSyncState>;
  published_at?: string;
  created_at: string;
  updated_at: string;
  images?: PropertyImage[];
}

export interface PropertyImage {
  id: string;
  property_id: string;
  url: string;
  alt_text?: string;
  sort_order: number;
  is_primary: boolean;
}

export interface Branch {
  id: string;
  name: string;
  rightmove_branch_id?: string;
  otm_branch_id?: string;
  rightmove_sync_enabled?: boolean;
  otm_sync_enabled?: boolean;
  address: string;
  phone: string;
}

export interface SiteContentBlock {
  id: string;
  key: string;
  title?: string;
  body: string;
  updated_at: string;
}

export interface Enquiry {
  id: string;
  property_id?: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  source: "website" | "email" | "rightmove" | "onthemarket";
  status: EnquiryStatus;
  created_at: string;
}

export interface TenantApplication {
  id: string;
  property_id?: string;
  status: ApplicationStatus;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  employment_status: string;
  annual_income?: number;
  current_address: string;
  move_in_date?: string;
  occupants: number;
  pets: boolean;
  pets_details?: string;
  reference_data: Record<string, unknown>;
  additional_info?: string;
  created_at: string;
}

export interface Complaint {
  id: string;
  property_id?: string;
  tenant_name: string;
  tenant_email: string;
  subject: string;
  description: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  source: "website" | "email";
  sla_due_at?: string;
  resolved_at?: string;
  created_at: string;
}

export interface PortalSyncLog {
  id: string;
  property_id: string;
  portal: PortalName;
  action: "send" | "remove" | "reconcile";
  status: SyncStatus;
  request_payload?: Record<string, unknown>;
  response_payload?: Record<string, unknown>;
  error_message?: string;
  created_at: string;
}

export interface PortalSyncJob {
  id: string;
  property_id: string;
  portal: PortalName;
  action: "send" | "remove";
  status: "pending" | "processing" | "completed" | "failed";
  attempts: number;
  scheduled_at: string;
  processed_at?: string;
}

export interface StaffProfile {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "staff";
}
