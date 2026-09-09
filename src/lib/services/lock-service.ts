import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { createClient } from "@/lib/supabase/server";

const scryptAsync = promisify(scrypt);

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  return { supabase, userId: user.id };
}

async function hashPin(pin: string, salt: string): Promise<string> {
  const derived = (await scryptAsync(pin, salt, 32)) as Buffer;
  return derived.toString("hex");
}

export async function isLockEnabled(): Promise<boolean> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("profiles")
    .select("lock_pin_hash")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data.lock_pin_hash != null;
}

export async function setLockPin(pin: string): Promise<void> {
  const { supabase, userId } = await requireUserId();
  const salt = randomBytes(16).toString("hex");
  const hash = await hashPin(pin, salt);
  const { error } = await supabase
    .from("profiles")
    .update({ lock_pin_hash: hash, lock_pin_salt: salt })
    .eq("id", userId);
  if (error) throw error;
}

export async function removeLockPin(): Promise<void> {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase
    .from("profiles")
    .update({ lock_pin_hash: null, lock_pin_salt: null })
    .eq("id", userId);
  if (error) throw error;
}

export async function verifyLockPin(pin: string): Promise<boolean> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("profiles")
    .select("lock_pin_hash, lock_pin_salt")
    .eq("id", userId)
    .single();
  if (error) throw error;
  if (!data.lock_pin_hash || !data.lock_pin_salt) return false;

  const candidate = await hashPin(pin, data.lock_pin_salt);
  const stored = Buffer.from(data.lock_pin_hash, "hex");
  const given = Buffer.from(candidate, "hex");
  // Fixed-length buffers (both are 32-byte scrypt outputs) — timingSafeEqual
  // requires equal lengths, which these always are, and it exists precisely
  // to avoid a timing side-channel leaking how many leading bytes matched.
  return timingSafeEqual(stored, given);
}
