
"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  addTenantAction,
  editTenantAction,
  deleteTenantAction,
  getTenantsAction,
  getYearlyReadingsAction,
  saveCurrentReadingAction,
  generateBillAction,
  getPreviousReadingAction,
} from "@/lib/actions";
import type { Tenant, Reading } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import {
  Copy,
  Plus,
  Save,
  Sparkles,
  RotateCcw,
  Loader2,
  Image as ImageIcon,
  Users,
  Pencil,
  Trash2,
  Calculator,
  Droplets,
  Check as CheckIcon,
  ChevronsUpDown,
  Download,
  Clipboard,
} from "lucide-react";

const formSchema = z.object({
  tenantName: z.string().min(1, "Tenant is required."),
  month: z.coerce.number(),
  year: z.coerce.number(),
  billDate: z.date(),
  dueDate: z.date(),
  currentReading: z.coerce.number().min(0),
  previousReading: z.coerce.number().min(0),
  previousDue: z.coerce.number().min(0),
  unitRate: z.coerce.number().positive("Unit rate must be positive."),
  waterCharges: z.coerce.number().min(0),
  applyWaterCharges: z.boolean(),
  penalty: z.coerce.number().min(0).optional(),
  roundOff: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

const AddTenantDialog = ({ onTenantAdded }: { onTenantAdded: () => void }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const { toast } = useToast();

  const handleAddTenant = async () => {
    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Tenant name cannot be empty.",
      });
      return;
    }
    const result = await addTenantAction(name);
    if (result.success) {
      toast({ title: "Success", description: `Tenant '${name}' added.` });
      onTenantAdded();
      setOpen(false);
      setName("");
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.error,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add Tenant
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Tenant</DialogTitle>
          <DialogDescription>
            Enter the name of the new tenant to add them to the system.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tenant Name"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddTenant}>Add Tenant</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ManageTenantsDialog = ({ tenants, onTenantsManaged, currentTenant }: { tenants: Tenant[], onTenantsManaged: () => void, currentTenant: string }) => {
    const [open, setOpen] = useState(false);
    const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
    const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);
    const [newName, setNewName] = useState("");
    const { toast } = useToast();

    const handleEditClick = (tenant: Tenant) => {
        setEditingTenant(tenant);
        setNewName(tenant.name);
    };

    const handleCancelEdit = () => {
        setEditingTenant(null);
        setNewName("");
    };

    const handleSaveEdit = async () => {
        if (!editingTenant) return;

        const result = await editTenantAction(editingTenant.id, newName);

        if (result.success) {
            toast({ title: "Success", description: "Tenant name updated." });
            onTenantsManaged();
            handleCancelEdit();
        } else {
            toast({ variant: "destructive", title: "Error", description: result.error });
        }
    };
    
    const handleDeleteTenant = async () => {
        if (!deletingTenant) return;

        const result = await deleteTenantAction(deletingTenant.id);
        if (result.success) {
            toast({ title: "Success", description: `Tenant '${deletingTenant.name}' deleted.`});
            onTenantsManaged();
            setDeletingTenant(null);
        } else {
            toast({ variant: "destructive", title: "Error", description: result.error});
        }
    };
    
    return (
        <>
            <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) handleCancelEdit(); }}>
                <DialogTrigger asChild>
                    <Button variant="outline"><Users className="mr-2 h-4 w-4" /> Manage Tenants</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Manage Tenants</DialogTitle>
                        <DialogDescription>Edit or delete tenant names.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                        {tenants.map(tenant => (
                            <div key={tenant.id} className="flex items-center justify-between">
                                {editingTenant?.id === tenant.id ? (
                                    <div className="flex-grow flex items-center gap-2">
                                        <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
                                        <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                                    </div>
                                ) : (
                                    <>
                                        <span>{tenant.name}</span>
                                        <div className="flex items-center">
                                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(tenant)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => setDeletingTenant(tenant)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deletingTenant} onOpenChange={(isOpen) => !isOpen && setDeletingTenant(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the tenant '{deletingTenant?.name}' and all of their associated readings. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeletingTenant(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteTenant} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};


const WaterBillCalculator = ({ allTenants, month, year, onReadingSaved, onWaterChargeCalculated, onWaterReadingChange }: { allTenants: Tenant[], month: number, year: number, onReadingSaved: () => void, onWaterChargeCalculated: (charge: number) => void, onWaterReadingChange: (reading: number) => void }) => {
    const [waterCurrent, setWaterCurrent] = useState(0);
    const [waterPrevious, setWaterPrevious] = useState(0);
    const [waterRate, setWaterRate] = useState(0);
    const [selectedTenants, setSelectedTenants] = useState<string[]>([]);
    const [waterBill, setWaterBill] = useState<{ en: string, hi: string } | null>(null);
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [roundOffWater, setRoundOffWater] = useState(false);

    useEffect(() => {
        onWaterReadingChange(waterCurrent);
    }, [waterCurrent, onWaterReadingChange]);


    const handleCalculate = () => {
        if (waterCurrent <= 0 || waterPrevious < 0 || waterRate <= 0 || selectedTenants.length === 0) {
            toast({
                variant: "destructive",
                title: "Invalid Input",
                description: "Please fill all fields and select at least one tenant.",
            });
            return;
        }
        if (waterCurrent < waterPrevious) {
            toast({
                variant: "destructive",
                title: "Invalid Input",
                description: "Current reading cannot be less than previous reading.",
            });
            return;
        }

        const consumed = waterCurrent - waterPrevious;
        const unitsPerTenant = consumed / selectedTenants.length;
        let chargePerTenant = unitsPerTenant * waterRate;
        
        if (roundOffWater) {
            chargePerTenant = Math.round(chargePerTenant);
        }

        onWaterChargeCalculated(parseFloat(chargePerTenant.toFixed(2)));

        const finalCharge = chargePerTenant.toFixed(2);

        const enBill = `WATER METER :-

Current Meter Reading: ${waterCurrent}
Previous Month Reading: ${waterPrevious}

Per unit rate = ₹${waterRate}

🚰 Total Water Unit:
${waterCurrent}(Current) - ${waterPrevious}(Previous) = ${consumed.toFixed(2)} units

💰 Charge per Tenant:
[${consumed.toFixed(2)} units / ${selectedTenants.length} Tenants ] = ${unitsPerTenant.toFixed(2)} units
${unitsPerTenant.toFixed(2)} × ₹${waterRate} = ₹${finalCharge}/Tenant`;

        const hiBill = `पानी मीटर :-

वर्तमान मीटर पठन: ${waterCurrent}
पिछले महीने का पठन: ${waterPrevious}

1 इकाई की दर= ₹${waterRate}

🚰 कुल जल इकाई:
${waterCurrent}(वर्तमान) - ${waterPrevious}(पिछले) = ${consumed.toFixed(2)} यूनिट

💰 प्रति किरायेदार शुल्क:
[${consumed.toFixed(2)} units / ${selectedTenants.length} किरायेदार ] = ${unitsPerTenant.toFixed(2)} यूनिट
${unitsPerTenant.toFixed(2)} × ₹${waterRate} = ₹${finalCharge}/किरायेदार`;

        setWaterBill({ en: enBill, hi: hiBill });
    };
    
    const handleReset = () => {
        setWaterCurrent(0);
        setWaterRate(0);
        setSelectedTenants([]);
        setWaterBill(null);
        setRoundOffWater(false);
        onWaterChargeCalculated(0); // Reset the charge in the main form
        toast({ title: "Calculator Reset", description: "Water bill calculator has been cleared."});
    };

    const copyToClipboard = (text: string, type: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copied!", description: `${type} water bill copied to clipboard.` });
    };

    useEffect(() => {
        // Since water reading is common, we use a fixed key "common_water_meter"
        const fetchReadings = async () => {
            const prevReading = await getPreviousReadingAction("common_water_meter", month, year, 'water');
            setWaterPrevious(prevReading);
        };
        fetchReadings();
    }, [month, year]);

    const handleSaveWaterReading = async () => {
        if (waterCurrent <= 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please enter a valid current reading for water.' });
            return;
        }
        setIsSaving(true);
        // Save the common reading under a special tenant name
        const result = await saveCurrentReadingAction({
            tenantName: 'common_water_meter',
            month,
            year,
            reading: waterCurrent,
            type: 'water',
        });
        if (result.success) {
            toast({ title: 'Success', description: 'Common water reading saved.' });
            onReadingSaved(); // This will refresh the tables
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsSaving(false);
    };
    
    const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
        if (event.target.value === "0") {
            event.target.select();
        }
    };


    return (
        <Card>
            <CardHeader>
                <CardTitle>Water Bill Calculator (Shared Meter)</CardTitle>
                <CardDescription>
                    Calculate water charges for multiple tenants sharing a single meter.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div>
                        <Label htmlFor="waterCurrent">Current Reading</Label>
                        <Input id="waterCurrent" type="number" value={waterCurrent} onChange={(e) => setWaterCurrent(parseFloat(e.target.value) || 0)} onFocus={handleFocus} />
                    </div>
                    <div>
                        <Label htmlFor="waterPrevious">Previous Reading</Label>
                        <Input id="waterPrevious" type="number" value={waterPrevious} onChange={(e) => setWaterPrevious(parseFloat(e.target.value) || 0)} onFocus={handleFocus} />
                    </div>
                    <div>
                        <Label htmlFor="waterRate">Unit Rate (₹)</Label>
                        <Input id="waterRate" type="number" value={waterRate} onChange={(e) => setWaterRate(parseFloat(e.target.value) || 0)} onFocus={handleFocus} />
                    </div>
                    <div>
                        <Label>Select Tenants</Label>
                        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={popoverOpen}
                                    className="w-full justify-between"
                                >
                                    {selectedTenants.length > 0
                                        ? `${selectedTenants.length} tenant(s) selected`
                                        : "Select tenants..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                    <CommandInput placeholder="Search tenants..." />
                                    <CommandList>
                                        <CommandEmpty>No tenants found.</CommandEmpty>
                                        <CommandGroup>
                                            {allTenants.map((tenant) => (
                                                <CommandItem
                                                    key={tenant.id}
                                                    onSelect={() => {
                                                        setSelectedTenants((prev) =>
                                                            prev.includes(tenant.name)
                                                                ? prev.filter((t) => t !== tenant.name)
                                                                : [...prev, tenant.name]
                                                        );
                                                    }}
                                                >
                                                    <CheckIcon
                                                        className={`mr-2 h-4 w-4 ${
                                                            selectedTenants.includes(tenant.name) ? "opacity-100" : "opacity-0"
                                                        }`}
                                                    />
                                                    {tenant.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
                 <div className="flex items-center space-x-2">
                    <Checkbox
                        id="roundOffWater"
                        checked={roundOffWater}
                        onCheckedChange={(checked) => setRoundOffWater(!!checked)}
                    />
                    <Label htmlFor="roundOffWater">Round Off Water Charge</Label>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button onClick={handleCalculate}>
                        <Calculator className="mr-2 h-4 w-4" /> Calculate Water Bill
                    </Button>
                    <Button onClick={handleSaveWaterReading} disabled={isSaving} variant="secondary">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Water Reading
                    </Button>
                     <Button variant="ghost" type="button" onClick={handleReset}>
                        <RotateCcw className="mr-2 h-4 w-4" /> Reset
                     </Button>
                </div>
                {waterBill && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>English Water Bill</CardTitle>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => copyToClipboard(waterBill.en, "English")}
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <pre className="whitespace-pre-wrap font-sans text-sm">
                                    {waterBill.en}
                                </pre>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Hindi Water Bill</CardTitle>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => copyToClipboard(waterBill.hi, "Hindi")}
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <pre className="whitespace-pre-wrap font-sans text-sm">
                                    {waterBill.hi}
                                </pre>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

const ReadingNote = ({ billDate, mainReading, waterReading }: { billDate: Date; mainReading: number; waterReading: number; }) => {
    const { toast } = useToast();
    const formattedDate = billDate.toLocaleDateString('en-IN');

    const noteText = `Current meter reading:-\n\n📅Date : ${formattedDate}📅\n\n1.Main Meter : ${(Number(mainReading) || 0).toFixed(2)}\n\n2.Water meter : ${(Number(waterReading) || 0).toFixed(2)}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(noteText);
        toast({ title: "Copied!", description: "Reading note copied to clipboard." });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Reading Note</CardTitle>
                <CardDescription>
                    A summary of the current readings.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <pre className="whitespace-pre-wrap font-sans text-sm bg-muted p-4 rounded-md">{noteText}</pre>
                <Button onClick={handleCopy}>
                    <Clipboard className="mr-2 h-4 w-4" /> Copy Note
                </Button>
            </CardContent>
        </Card>
    );
};


export default function BillingDashboard() {
  const { toast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [yearlyReadings, setYearlyReadings] = useState<Reading[]>([]);
  const [tableYear, setTableYear] = useState(new Date().getFullYear());
  const [generatedBill, setGeneratedBill] = useState<{
    english: string;
    hindi: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState({
    bill: false,
    save: false,
  });

  const [waterImage, setWaterImage] = useState<File | null>(null);
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [waterImagePreview, setWaterImagePreview] = useState<string | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [mergedImagePreview, setMergedImagePreview] = useState<string | null>(null);
  const [currentWaterReading, setCurrentWaterReading] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);


  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tenantName: "",
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      billDate: new Date(),
      dueDate: new Date(),
      previousDue: 0,
      unitRate: 0,
      waterCharges: 0,
      applyWaterCharges: true,
      penalty: 0,
      roundOff: false,
      currentReading: 0,
      previousReading: 0,
    },
  });

  const tenantName = form.watch("tenantName");
  const month = form.watch("month");
  const year = form.watch("year");
  const mainMeterReading = form.watch("currentReading");
  const billDate = form.watch("billDate");


  const fetchTenants = useCallback(async (updatedTenantName?: string) => {
    const tenantsData = await getTenantsAction();
    setTenants(tenantsData);

    const currentTenantName = form.getValues('tenantName');
    
    if (updatedTenantName && tenantsData.some(t => t.name === updatedTenantName)) {
        form.setValue('tenantName', updatedTenantName);
    } else if (tenantsData.some(t => t.name === currentTenantName)) {
        // Current tenant still exists, do nothing
    } else if (tenantsData.length > 0) {
        form.setValue('tenantName', tenantsData[0].name);
    } else {
        form.setValue('tenantName', '');
    }
  }, [form]);


  const fetchYearlyReadings = useCallback(async (year: number) => {
    const readingsData = await getYearlyReadingsAction(year);
    setYearlyReadings(readingsData);
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]); 

  useEffect(() => {
    fetchYearlyReadings(tableYear);
  }, [tableYear, fetchYearlyReadings]);

  useEffect(() => {
    if (tenantName && month && year) {
      const fetchReadings = async () => {
          const prevReading = await getPreviousReadingAction(tenantName, month, year, 'electricity');
          form.setValue("previousReading", prevReading);

          const currentReadingForMonth = yearlyReadings.find(
            r => r.tenantName === tenantName && r.month === month && r.year === year && r.type === 'electricity'
          );

          if (currentReadingForMonth) {
            form.setValue("currentReading", currentReadingForMonth.reading);
          } else {
            form.setValue("currentReading", 0);
          }
      };
      fetchReadings();
    }
  }, [tenantName, month, year, yearlyReadings, form]);
  
  const handleImageJoin = async () => {
    if (!waterImage || !mainImage || !canvasRef.current) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select both images.',
      });
      return;
    }
    setIsJoining(true);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not get canvas context.' });
      setIsJoining(false);
      return;
    }

    const waterImg = new Image();
    const mainImg = new Image();

    const loadImage = (img: HTMLImageElement, file: File) => {
      return new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      });
    };

    try {
      await Promise.all([loadImage(waterImg, waterImage), loadImage(mainImg, mainImage)]);
      
      const maxHeight = Math.max(waterImg.height, mainImg.height);
      const waterAspectRatio = waterImg.width / waterImg.height;
      const mainAspectRatio = mainImg.width / mainImg.height;

      const waterResizedWidth = maxHeight * waterAspectRatio;
      const mainResizedWidth = maxHeight * mainAspectRatio;
      
      canvas.width = waterResizedWidth + mainResizedWidth;
      canvas.height = maxHeight;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(waterImg, 0, 0, waterResizedWidth, maxHeight);
      ctx.drawImage(mainImg, waterResizedWidth, 0, mainResizedWidth, maxHeight);

      setMergedImagePreview(canvas.toDataURL('image/png'));
      toast({ title: 'Success', description: 'Images joined. Preview is available below.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load images.' });
    } finally {
      setIsJoining(false);
      // Clean up blobs
      URL.revokeObjectURL(waterImg.src);
      URL.revokeObjectURL(mainImg.src);
    }
  };


  const onTenantsManaged = useCallback(() => {
    fetchTenants(); 
  }, [fetchTenants]);

  const handleSaveReading = async () => {
    setIsLoading((prev) => ({ ...prev, save: true }));
    const result = await saveCurrentReadingAction({
      tenantName: form.getValues("tenantName"),
      month: form.getValues("month"),
      year: form.getValues("year"),
      reading: form.getValues("currentReading"),
      type: 'electricity',
    });

    if (result.success) {
      toast({ title: "Success", description: "Reading saved." });
      fetchYearlyReadings(tableYear);
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.error,
      });
    }
    setIsLoading((prev) => ({ ...prev, save: false }));
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsLoading((prev) => ({ ...prev, bill: true }));
    setGeneratedBill(null);
    
    // Always save the reading when generating a bill
    await saveCurrentReadingAction({
      tenantName: data.tenantName,
      month: data.month,
      year: data.year,
      reading: data.currentReading,
      type: 'electricity'
    });
    await fetchYearlyReadings(tableYear);

    const result = await generateBillAction(data);
    if (result.success && result.data) {
      setGeneratedBill(result.data);
    } else {
      toast({
        variant: "destructive",
        title: "AI Error",
        description: result.error || "Failed to generate bill.",
      });
    }
    setIsLoading((prev) => ({ ...prev, bill: false }));
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${type} bill copied to clipboard.` });
  };
  
  const allTenantsForTable = useMemo(() => {
    const namesFromReadings = new Set(yearlyReadings.map(r => r.tenantName));
    const namesFromTenants = new Set(tenants.map(t => t.name));
    // Exclude the special key for common water meter from the table display
    const combined = Array.from(new Set([...namesFromReadings, ...namesFromTenants])).filter(t => t !== 'common_water_meter').sort();
    return combined;
  }, [yearlyReadings, tenants]);


  const electricityReadings = useMemo(() => yearlyReadings.filter(r => r.type === 'electricity'), [yearlyReadings]);
  const waterReadings = useMemo(() => yearlyReadings.filter(r => r.type === 'water'), [yearlyReadings]);

  const monthAbbreviations = useMemo(() => {
      return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  }, []);

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    if (event.target.value === "0") {
      event.target.select();
    }
  };


  return (
    <div className="p-4 md:p-8 space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-800 font-headline">
            BillEase 💡
          </h1>
          <p className="text-muted-foreground">Dynamic and intelligent billing software.</p>
        </div>
        <div className="flex gap-2">
            <ManageTenantsDialog tenants={tenants} onTenantsManaged={onTenantsManaged} currentTenant={tenantName} />
            <AddTenantDialog onTenantAdded={onTenantsManaged} />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="lg:col-span-2 space-y-4"
        >
          <Card>
            <CardHeader>
              <CardTitle>Billing Details</CardTitle>
              <CardDescription>
                Fill in the details below to generate a bill.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="tenantName">Tenant</Label>
                  <Select
                    onValueChange={(value) => form.setValue("tenantName", value)}
                    value={form.watch("tenantName")}
                  >
                    <SelectTrigger id="tenantName">
                      <SelectValue placeholder="Select Tenant" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.map((t) => (
                        <SelectItem key={t.id} value={t.name}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="month">Month</Label>
                  <Select
                    onValueChange={(v) => form.setValue("month", parseInt(v))}
                    value={String(form.watch("month"))}
                  >
                    <SelectTrigger id="month">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>
                          {new Date(0, i).toLocaleString("default", {
                            month: "long",
                          })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    {...form.register("year")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="billDate">Bill Date</Label>
                  <DatePicker
                    date={form.watch("billDate")}
                    onDateChange={(d) => form.setValue("billDate", d as Date)}
                  />
                </div>
                <div>
                  <Label htmlFor="dueDate">Due Date</Label>
                  <DatePicker
                    date={form.watch("dueDate")}
                    onDateChange={(d) => form.setValue("dueDate", d as Date)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="currentReading">Current Reading</Label>
                  <Input
                    id="currentReading"
                    type="number"
                    {...form.register("currentReading")}
                    onFocus={handleFocus}
                  />
                </div>
                <div>
                  <Label htmlFor="previousReading">Previous Reading</Label>
                  <Input
                    id="previousReading"
                    type="number"
                    {...form.register("previousReading")}
                    onFocus={handleFocus}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                  <Label htmlFor="previousDue">Previous Due</Label>
                  <Input
                    id="previousDue"
                    type="number"
                    {...form.register("previousDue")}
                    onFocus={handleFocus}
                  />
                </div>
                 <div>
                  <Label htmlFor="unitRate">Unit Rate</Label>
                  <Input
                    id="unitRate"
                    type="number"
                    step="0.01"
                    {...form.register("unitRate")}
                    onFocus={handleFocus}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                   <Label htmlFor="waterCharges">Water Charges</Label>
                   <Input
                    id="waterCharges"
                    type="number"
                    {...form.register("waterCharges")}
                    onFocus={handleFocus}
                  />
                </div>
                <div>
                  <Label htmlFor="penalty">Penalty</Label>
                  <Input
                    id="penalty"
                    type="number"
                    {...form.register("penalty")}
                    onFocus={handleFocus}
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                 <Checkbox
                    id="applyWaterCharges"
                    checked={form.watch("applyWaterCharges")}
                    onCheckedChange={(checked) =>
                        form.setValue("applyWaterCharges", !!checked)
                    }
                    />
                <Label htmlFor="applyWaterCharges">Apply Water Charges</Label>
              </div>


              <div className="flex items-center space-x-2">
                <Checkbox
                  id="roundOff"
                  checked={form.watch("roundOff")}
                  onCheckedChange={(checked) =>
                    form.setValue("roundOff", !!checked)
                  }
                />
                <Label htmlFor="roundOff">Round Off Total</Label>
              </div>

              <div className="flex flex-wrap gap-2 pt-4">
                <Button type="submit" disabled={isLoading.bill || !form.formState.isValid}>
                  {isLoading.bill ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Generate Bill
                </Button>
                 <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="secondary" type="button" disabled={!form.watch("currentReading")}>
                        <Save className="mr-2 h-4 w-4"/> Save Reading
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm Save</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will save or overwrite the reading for the selected tenant and period. Continue?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleSaveReading} disabled={isLoading.save}>
                         {isLoading.save && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                         Save
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                 <Button
                  variant="ghost"
                  type="button"
                  onClick={() => {
                    const tenant = form.getValues('tenantName');
                    form.reset();
                    form.setValue('tenantName', tenant);
                    setGeneratedBill(null);
                  }}
                >
                  <RotateCcw className="mr-2 h-4 w-4" /> Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>

        <div className="lg:col-span-3 space-y-4">
          {isLoading.bill && (
             <Card className="flex items-center justify-center h-full min-h-[300px]">
                <div className="text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary"/>
                    <p className="mt-4">Generating your bill with AI...</p>
                </div>
            </Card>
          )}
          {generatedBill && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>English Bill</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(generatedBill.english, "English")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap font-sans text-sm">
                    {generatedBill.english}
                  </pre>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Hindi Bill</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(generatedBill.hindi, "Hindi")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap font-sans text-sm">
                    {generatedBill.hindi}
                  </pre>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <WaterBillCalculator allTenants={tenants} month={month} year={year} onReadingSaved={() => fetchYearlyReadings(tableYear)} onWaterChargeCalculated={(charge) => form.setValue('waterCharges', charge)} onWaterReadingChange={setCurrentWaterReading} />
        <ReadingNote billDate={billDate} mainReading={mainMeterReading} waterReading={currentWaterReading} />
      </div>


       <Card>
        <CardHeader>
          <CardTitle>Image Joiner</CardTitle>
          <CardDescription>
            Combine water and main submeter photos into a single image.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="waterImage">Water Submeter Photo</Label>
              <Input
                id="waterImage"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setWaterImage(file);
                  if (waterImagePreview) {
                    URL.revokeObjectURL(waterImagePreview);
                  }
                  if (file) {
                    setWaterImagePreview(URL.createObjectURL(file));
                  } else {
                    setWaterImagePreview(null);
                  }
                   setMergedImagePreview(null);
                }}
              />
              {waterImagePreview && (
                <img
                  src={waterImagePreview}
                  alt="Water submeter preview"
                  className="mt-2 rounded-md max-h-48 object-contain"
                />
              )}
            </div>
            <div>
              <Label htmlFor="mainImage">Main Submeter Photo</Label>
              <Input
                id="mainImage"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setMainImage(file);
                  if (mainImagePreview) {
                    URL.revokeObjectURL(mainImagePreview);
                  }
                  if (file) {
                    setMainImagePreview(URL.createObjectURL(file));
                  } else {
                    setMainImagePreview(null);
                  }
                  setMergedImagePreview(null);
                }}
              />
              {mainImagePreview && (
                <img
                  src={mainImagePreview}
                  alt="Main submeter preview"
                  className="mt-2 rounded-md max-h-48 object-contain"
                />
              )}
            </div>
          </div>
          <Button onClick={handleImageJoin} disabled={isJoining || !waterImage || !mainImage}>
            {isJoining ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="mr-2 h-4 w-4" />
            )}
            Join Images
          </Button>
          <canvas ref={canvasRef} className="hidden"></canvas>
           {mergedImagePreview && (
            <div className="mt-4 space-y-4 flex flex-col items-center">
                <CardTitle>Joined Image Preview</CardTitle>
                 <img
                  src={mergedImagePreview}
                  alt="Merged submeter preview"
                  className="mt-2 rounded-md max-h-96 object-contain border p-2"
                />
                <a href={mergedImagePreview} download="merged-meter-photos.png">
                    <Button>
                        <Download className="mr-2 h-4 w-4" /> Download Image
                    </Button>
                </a>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle>Yearly Readings</CardTitle>
                    <CardDescription>
                    Overview of meter readings for the selected year.
                    </CardDescription>
                </div>
                <div className="w-32">
                    <Select onValueChange={(v) => setTableYear(parseInt(v))} defaultValue={String(tableYear)}>
                        <SelectTrigger>
                            <SelectValue/>
                        </SelectTrigger>
                        <SelectContent>
                             {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                                <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                             ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4"/> <span>Tenant / Meter</span>
                    </div>
                  </TableHead>
                  {monthAbbreviations.map((month) => (
                    <TableHead key={month} className="text-center">
                      {month}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {allTenantsForTable.map((tenant) => (
                  <TableRow key={tenant}>
                    <TableCell className="font-medium">{tenant}</TableCell>
                    {Array.from({ length: 12 }, (_, i) => {
                      const month = i + 1;
                      const reading = electricityReadings.find(
                        (r) =>
                          r.tenantName === tenant &&
                          r.month === month &&
                          r.year === tableYear
                      );
                      return (
                        <TableCell key={i} className="text-center">
                          {reading ? reading.reading : "-"}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50">
                  <TableCell className="font-medium">
                     <div className="flex items-center gap-2">
                        <Droplets className="h-4 w-4 text-blue-500"/>
                        <span>Common Water Meter</span>
                     </div>
                  </TableCell>
                  {Array.from({ length: 12 }, (_, i) => {
                    const month = i + 1;
                    const reading = waterReadings.find(
                      (r) =>
                        r.tenantName === "common_water_meter" &&
                        r.month === month &&
                        r.year === tableYear
                    );
                    return (
                      <TableCell key={i} className="text-center font-semibold">
                        {reading ? reading.reading : "-"}
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
