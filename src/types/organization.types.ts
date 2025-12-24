import { Organization } from "../../generated/prisma/client";

export interface CreateOrganizationDto {
  name: string;
  displayName: string;
  email: string;

  logo?: string;
  website?: string;
  phone?: string;

  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;

  gstin?: string;
  pan?: string;
  tan?: string;
  pfNumber?: string;
  esiNumber?: string;

  establishmentDate?: Date;
  industryType?: string;
  companySize?: string;

  fiscalYearStart?: number; // 1–12
  weekendDays?: string[];   // ["SATURDAY", "SUNDAY"]

  settings?: Record<string, unknown>;
}


export interface UpdateOrganizationDto {
  displayName?: string;
  logo?: string;
  website?: string;
  phone?: string;

  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;

  gstin?: string;
  pan?: string;
  tan?: string;
  pfNumber?: string;
  esiNumber?: string;

  establishmentDate?: Date;
  industryType?: string;
  companySize?: string;

  fiscalYearStart?: number;
  weekendDays?: string[];

  isActive?: boolean;
  settings?: Record<string, unknown>;
}

/********************* API RESPONSE TYPES ****************************/

export type OrganizationResponse = Pick<
  Organization,
  | "id"
  | "name"
  | "displayName"
  | "logo"
  | "website"
  | "email"
  | "phone"
  | "address"
  | "city"
  | "state"
  | "country"
  | "pincode"
  | "industryType"
  | "companySize"
  | "fiscalYearStart"
  | "weekendDays"
  | "isActive"
  | "createdAt"
>;

export type OrganizationComplianceResponse = Pick<
  Organization,
  | "id"
  | "gstin"
  | "pan"
  | "tan"
  | "pfNumber"
  | "esiNumber"
  | "establishmentDate"
>;

export interface OrganizationContext {
  organizationId: string;
  isActive: boolean;
}
export interface OrganizationFilterDto {
  isActive?: boolean;
  industryType?: string;
  country?: string;
  search?: string; // name / displayName
}
