/**
 * Mock saved-address repository for authenticated members.
 * No backend — in-memory fixture keyed by member email.
 */

import type { SavedAddress, SavedAddressLabel } from "./types";

/** Delivery address draft shape shared with checkout / pickup (no app import). */
export type SavedAddressDeliveryDraft = {
  recipient: string;
  phone: string;
  address: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
  building: string;
  unitFloor: string;
  notes: string;
};

const MOCK_ADDRESSES: SavedAddress[] = [
  {
    id: "addr-home",
    label: "Home",
    recipient: "Marie Dupont",
    phone: "0812345678",
    address: "88 Sukhumvit Soi 24",
    subdistrict: "Khlong Tan",
    district: "Khlong Toei",
    province: "Bangkok",
    postalCode: "10110",
    building: "Residence One",
    unitFloor: "12A",
    notes: "",
  },
  {
    id: "addr-office",
    label: "Office",
    recipient: "Marie Dupont",
    phone: "0812345678",
    address: "999 Ploenchit Road",
    subdistrict: "Lumphini",
    district: "Pathum Wan",
    province: "Bangkok",
    postalCode: "10330",
    building: "Central Office Tower",
    unitFloor: "Floor 18",
    notes: "Reception",
  },
  {
    id: "addr-other",
    label: "Other",
    recipient: "Marie Dupont",
    phone: "0898765432",
    address: "12 Charoen Nakhon Road",
    subdistrict: "Khlong Ton Sai",
    district: "Khlong San",
    province: "Bangkok",
    postalCode: "10600",
    building: "",
    unitFloor: "",
    notes: "",
  },
];

export type SavedAddressRepository = {
  listForMember(email: string | null | undefined): SavedAddress[];
  findById(
    email: string | null | undefined,
    addressId: string,
  ): SavedAddress | null;
};

export function createMockSavedAddressRepository(
  addresses: SavedAddress[] = MOCK_ADDRESSES,
): SavedAddressRepository {
  return {
    listForMember(email) {
      if (!email?.trim()) return [];
      return addresses.map((address) => ({ ...address }));
    },
    findById(email, addressId) {
      if (!email?.trim()) return null;
      const found = addresses.find((address) => address.id === addressId);
      return found ? { ...found } : null;
    },
  };
}

export const mockSavedAddressRepository = createMockSavedAddressRepository();

export const SAVED_ADDRESS_LABELS: SavedAddressLabel[] = [
  "Home",
  "Office",
  "Other",
];

export function savedAddressToDeliveryDraft(
  address: SavedAddress,
): SavedAddressDeliveryDraft {
  return {
    recipient: address.recipient,
    phone: address.phone,
    address: address.address,
    subdistrict: address.subdistrict,
    district: address.district,
    province: address.province,
    postalCode: address.postalCode,
    building: address.building ?? "",
    unitFloor: address.unitFloor ?? "",
    notes: address.notes ?? "",
  };
}

export function listMockSavedAddresses(
  email: string | null | undefined,
): SavedAddress[] {
  return mockSavedAddressRepository.listForMember(email);
}

export function getMockSavedAddress(
  email: string | null | undefined,
  addressId: string,
): SavedAddress | null {
  return mockSavedAddressRepository.findById(email, addressId);
}
