import { delay, profile, setProfile } from "./mocks";
import type { Profile } from "../types";

export async function getProfile(): Promise<Profile> {
  return delay({ ...profile });
}

export async function saveProfile(next: Profile): Promise<Profile> {
  setProfile({ ...next });
  return delay({ ...next });
}