export interface Tenant {
  id: string;
  name: string;
}

export type ReadingType = "electricity" | "water";

export interface Reading {
  id: string;
  tenantName: string;
  month: number;
  year: number;
  reading: number;
  type: ReadingType;
}
