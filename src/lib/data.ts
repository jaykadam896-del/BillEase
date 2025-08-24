import type { Tenant, Reading, ReadingType } from "./types";

let tenants: Tenant[] = [];
let readings: Reading[] = [];
let tenantIdCounter = 1;
let readingIdCounter = 1;

// Initialize with default tenants if empty
const initDefaultTenants = () => {
    if (tenants.length === 0) {
        const defaultTenantNames = [
            "Dada", "Dharmendra", "Room 22", "Radhe room",
            "ankurbha", "dagi room", "shop 195", "Room 122",
            "shop parlor", "shop laundry", "charging"
        ];
        defaultTenantNames.forEach(name => {
            if (!tenants.some(t => t.name === name)) {
                tenants.push({ id: String(tenantIdCounter++), name });
            }
        });
    }
};

initDefaultTenants();

export function getTenants(): Tenant[] {
  return [...tenants].sort((a, b) => a.name.localeCompare(b.name));
}

export function addTenant(name: string): boolean {
  if (!name.trim()) {
    throw new Error("Tenant name cannot be empty.");
  }
  if (tenants.some((tenant) => tenant.name.toLowerCase() === name.trim().toLowerCase())) {
    throw new Error(`Tenant '${name}' already exists.`);
  }
  const newTenant: Tenant = {
    id: String(tenantIdCounter++),
    name: name.trim(),
  };
  tenants.push(newTenant);
  return true;
}

export function editTenant(id: string, newName: string): boolean {
    const tenantToUpdate = tenants.find(t => t.id === id);
    if (!tenantToUpdate) {
        throw new Error("Tenant not found.");
    }

    const trimmedNewName = newName.trim();
    if (!trimmedNewName) {
        throw new Error("Tenant name cannot be empty.");
    }

    if (tenants.some(t => t.id !== id && t.name.toLowerCase() === trimmedNewName.toLowerCase())) {
        throw new Error(`Tenant with name '${trimmedNewName}' already exists.`);
    }

    const oldName = tenantToUpdate.name;
    tenantToUpdate.name = trimmedNewName;

    // Update tenant name in readings as well
    readings.forEach(r => {
        if (r.tenantName === oldName) {
            r.tenantName = trimmedNewName;
        }
    });
    
    return true;
}

export function deleteTenant(id: string): boolean {
    const tenantIndex = tenants.findIndex(t => t.id === id);
    if (tenantIndex === -1) {
        throw new Error("Tenant not found.");
    }
    const tenantName = tenants[tenantIndex].name;
    tenants.splice(tenantIndex, 1);
    
    // Also remove readings for this tenant
    readings = readings.filter(r => r.tenantName !== tenantName);
    
    return true;
}

export function saveCurrentReading(
  tenantName: string,
  month: number,
  year: number,
  reading: number,
  type: ReadingType = "electricity"
): void {
  const existingIndex = readings.findIndex(
    (r) =>
      r.tenantName === tenantName && r.month === month && r.year === year && r.type === type
  );

  if (existingIndex !== -1) {
    readings[existingIndex].reading = reading;
  } else {
    readings.push({
      id: String(readingIdCounter++),
      tenantName,
      month,
      year,
      reading,
      type,
    });
  }
}

export function getPreviousReading(
  tenantName: string,
  month: number,
  year: number,
  type: ReadingType = "electricity"
): number {
  let prevMonth = month - 1;
  let prevYear = year;

  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear = year - 1;
  }

  const reading = readings.find(
    (r) =>
      r.tenantName === tenantName && r.month === prevMonth && r.year === prevYear && r.type === type
  );

  return reading ? reading.reading : 0;
}

export function getYearlyReadings(year: number): Reading[] {
  // If year is 0, return all readings. Useful for getting complete historical data.
  const filteredReadings = readings.filter((r) => year === 0 || r.year === year);
  
  return filteredReadings.sort((a, b) => {
      if (a.tenantName < b.tenantName) return -1;
      if (a.tenantName > b.tenantName) return 1;
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
  });
}
