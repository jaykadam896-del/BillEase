'use server';

import { z } from "zod";
import {
  addTenant,
  editTenant,
  deleteTenant,
  getTenants,
  getYearlyReadings,
  saveCurrentReading,
  getPreviousReading,
} from "./data";
import { generateBillSummary } from "@/ai/flows/generate-bill-summary";
import type { Reading, ReadingType } from "./types";

const addTenantSchema = z.string().min(1, "Tenant name cannot be empty.");
const editTenantSchema = z.object({
    id: z.string(),
    name: z.string().min(1, "Tenant name cannot be empty."),
});

export async function addTenantAction(name: string) {
  try {
    const validatedName = addTenantSchema.parse(name);
    addTenant(validatedName);
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: (error as Error).message };
  }
}

export async function editTenantAction(id: string, name: string) {
  try {
    const {id: validatedId, name: validatedName} = editTenantSchema.parse({id, name});
    editTenant(validatedId, validatedName);
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: (error as Error).message };
  }
}

const deleteTenantSchema = z.string();

export async function deleteTenantAction(id: string) {
    try {
        const validatedId = deleteTenantSchema.parse(id);
        deleteTenant(validatedId);
        return { success: true };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, error: error.errors[0].message };
        }
        return { success: false, error: (error as Error).message };
    }
}


export async function getTenantsAction() {
  return getTenants();
}

export async function getYearlyReadingsAction(year: number) {
  return getYearlyReadings(year);
}

const saveReadingSchema = z.object({
  tenantName: z.string(),
  month: z.number(),
  year: z.number(),
  reading: z.number(),
  type: z.enum(["electricity", "water"]),
});

export async function saveCurrentReadingAction(input: {
  tenantName: string;
  month: number;
  year: number;
  reading: number;
  type?: ReadingType;
}) {
  try {
    const validatedInput = saveReadingSchema.parse({
        ...input,
        type: input.type || 'electricity',
    });
    if (!validatedInput.tenantName) {
        return { success: false, error: "Tenant name is required to save a reading." };
    }
    if (validatedInput.reading <= 0) {
        return { success: false, error: "Current reading must be a positive number." };
    }
    saveCurrentReading(
      validatedInput.tenantName,
      validatedInput.month,
      validatedInput.year,
      validatedInput.reading,
      validatedInput.type
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to save reading." };
  }
}

export async function getPreviousReadingAction(
  tenantName: string,
  month: number,
  year: number,
  type: ReadingType = "electricity"
) {
  if (!tenantName) return 0;
  return getPreviousReading(tenantName, month, year, type);
}

const generateBillSchema = z.object({
  tenantName: z.string().min(1, "Tenant is required."),
  billDate: z.date(),
  dueDate: z.date(),
  currentReading: z.number().min(0),
  previousReading: z.number().min(0),
  previousDue: z.number().min(0),
  unitRate: z.number().positive("Unit rate must be positive"),
  waterCharges: z.number().min(0),
  applyWaterCharges: z.boolean(),
  penalty: z.number().optional(),
  roundOff: z.boolean(),
});

export async function generateBillAction(
  input: z.infer<typeof generateBillSchema>
) {
  try {
    const data = generateBillSchema.parse(input);

    const unitsConsumed = data.currentReading - data.previousReading;
    if (unitsConsumed < 0) {
      return { success: false, error: "Current reading cannot be less than previous reading." };
    }
    
    let elecCharges = unitsConsumed * data.unitRate + data.previousDue;
    const waterCharges = data.applyWaterCharges ? data.waterCharges : 0;
    
    let totalAmount = elecCharges + waterCharges + (data.penalty || 0);
    
    if (data.roundOff) {
      elecCharges = Math.round(elecCharges);
      totalAmount = Math.round(totalAmount);
    }

    const aiInput = {
      tenantName: data.tenantName,
      billDate: data.billDate.toLocaleDateString("en-IN"),
      dueDate: data.dueDate.toLocaleDateString("en-IN"),
      currentReading: data.currentReading,
      previousReading: data.previousReading,
      unitsConsumed: unitsConsumed,
      unitRate: data.unitRate,
      previousDue: data.previousDue,
      electricityCharges: elecCharges,
      waterCharges: data.waterCharges, // Pass original value for display
      applyWaterCharges: data.applyWaterCharges,
      penalty: data.penalty || 0,
      totalAmount: totalAmount,
    };

    const result = await generateBillSummary(aiInput);
    
    return {
      success: true,
      data: { english: result.englishBill, hindi: result.hindiBill },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors.map(e => e.message).join(', ') };
    }
    console.error("Bill Generation Error:", error);
    return { success: false, error: "An unexpected error occurred during bill generation." };
  }
}
