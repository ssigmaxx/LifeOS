"use client";

import { useActionState, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ENERGY_KIND_LABELS,
  PURCHASE_CATEGORY_LABELS,
  TRAVEL_MODE_LABELS,
  type EnergyKind,
  type PurchaseCategoryOption,
  type TravelModeOption,
} from "@/lib/carbon/categories";
import { logEnergyAction, logPurchaseAction, logTravelAction, type FormActionState } from "./actions";

const initialState: FormActionState = { error: null };

function useLoggedOnSuccess(
  action: (input: unknown) => Promise<FormActionState>,
  onLogged: () => void,
) {
  return useActionState(async (_prev: FormActionState, formData: FormData) => {
    const result = await action(Object.fromEntries(formData));
    if (!result.error) onLogged();
    return result;
  }, initialState);
}

function TravelForm({ onLogged }: { onLogged: () => void }) {
  const [mode, setMode] = useState<TravelModeOption>("car");
  const [state, formAction, isPending] = useLoggedOnSuccess(logTravelAction, onLogged);

  return (
    <form
      action={(formData) => {
        formData.set("mode", mode);
        formAction(formData);
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="mode">Mode</Label>
        <Select value={mode} onValueChange={(v) => setMode(v as TravelModeOption)}>
          <SelectTrigger id="mode" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(TRAVEL_MODE_LABELS) as TravelModeOption[]).map((m) => (
              <SelectItem key={m} value={m}>
                {TRAVEL_MODE_LABELS[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="distanceKm">Distance (km)</Label>
        <Input id="distanceKm" name="distanceKm" type="number" step="any" min={0} required />
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Logging…" : "Log travel"}
      </Button>
    </form>
  );
}

function EnergyForm({ onLogged }: { onLogged: () => void }) {
  const [kind, setKind] = useState<EnergyKind>("electricity");
  const [state, formAction, isPending] = useLoggedOnSuccess(logEnergyAction, onLogged);

  return (
    <form
      action={(formData) => {
        formData.set("kind", kind);
        formAction(formData);
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="kind">Type</Label>
        <Select value={kind} onValueChange={(v) => setKind(v as EnergyKind)}>
          <SelectTrigger id="kind" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(ENERGY_KIND_LABELS) as EnergyKind[]).map((k) => (
              <SelectItem key={k} value={k}>
                {ENERGY_KIND_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="amount">Usage (kWh)</Label>
        <Input id="amount" name="amount" type="number" step="any" min={0} required />
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Logging…" : "Log energy"}
      </Button>
    </form>
  );
}

function PurchaseForm({ onLogged }: { onLogged: () => void }) {
  const [category, setCategory] = useState<PurchaseCategoryOption>("groceries");
  const [state, formAction, isPending] = useLoggedOnSuccess(logPurchaseAction, onLogged);

  return (
    <form
      action={(formData) => {
        formData.set("category", category);
        formAction(formData);
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select value={category} onValueChange={(v) => setCategory(v as PurchaseCategoryOption)}>
          <SelectTrigger id="category" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PURCHASE_CATEGORY_LABELS) as PurchaseCategoryOption[]).map((c) => (
              <SelectItem key={c} value={c}>
                {PURCHASE_CATEGORY_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="amount">Amount (EUR)</Label>
        <Input id="amount" name="amount" type="number" step="any" min={0} required />
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Logging…" : "Log purchase"}
      </Button>
    </form>
  );
}

export function CarbonLogDialog({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log activity</DialogTitle>
          <DialogDescription>Add a travel trip, home energy usage, or a purchase.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="travel">
          <TabsList className="w-full">
            <TabsTrigger value="travel">Travel</TabsTrigger>
            <TabsTrigger value="energy">Energy</TabsTrigger>
            <TabsTrigger value="shopping">Shopping</TabsTrigger>
          </TabsList>
          <TabsContent value="travel" className="pt-2">
            <TravelForm onLogged={close} />
          </TabsContent>
          <TabsContent value="energy" className="pt-2">
            <EnergyForm onLogged={close} />
          </TabsContent>
          <TabsContent value="shopping" className="pt-2">
            <PurchaseForm onLogged={close} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
