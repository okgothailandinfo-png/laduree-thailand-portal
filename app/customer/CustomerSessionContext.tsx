"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  CustomerAuthProvider,
  EmailPasswordCredentials,
} from "@/lib/customer/auth-provider";
import { mockCustomerAuthProvider } from "@/lib/customer/mock-auth-provider";
import { createAnonymousSession } from "@/lib/customer/session";
import {
  getMockSavedAddress,
  listMockSavedAddresses,
} from "@/lib/customer/saved-addresses";
import type { CustomerSession, SavedAddress } from "@/lib/customer/types";

type CustomerSessionContextValue = {
  session: CustomerSession;
  customerType: CustomerSession["customerType"];
  customerName: string | null;
  email: string | null;
  phone: string | null;
  isAuthenticated: boolean;
  /** Hydration complete — avoids SSR/localStorage mismatch flashes. */
  ready: boolean;
  savedAddresses: SavedAddress[];
  selectedSavedAddressId: string | null;
  selectedSavedAddress: SavedAddress | null;
  selectSavedAddress: (addressId: string | null) => void;
  continueAsGuest: () => void;
  signInWithEmail: (
    credentials: EmailPasswordCredentials,
  ) => Promise<CustomerSession>;
  signOut: () => Promise<void>;
  /** Always rejects — LINE is a disabled placeholder. */
  signInWithLine: () => Promise<CustomerSession>;
};

const CustomerSessionContext =
  createContext<CustomerSessionContextValue | null>(null);

function readInitialSession(authProvider: CustomerAuthProvider): CustomerSession {
  if (typeof window === "undefined") return createAnonymousSession();
  return authProvider.getSession();
}

export function CustomerSessionProvider({
  children,
  authProvider = mockCustomerAuthProvider,
}: {
  children: ReactNode;
  /** Injectable for tests / future real providers. */
  authProvider?: CustomerAuthProvider;
}) {
  const [session, setSession] = useState<CustomerSession>(() =>
    readInitialSession(authProvider),
  );
  const [ready] = useState(() => typeof window !== "undefined");
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<
    string | null
  >(null);

  const savedAddresses = useMemo(() => {
    if (!session.isAuthenticated || session.customerType !== "member") {
      return [];
    }
    return listMockSavedAddresses(session.email);
  }, [session]);

  const resolvedSavedAddressId = useMemo(() => {
    if (session.customerType !== "member" || !session.isAuthenticated) {
      return null;
    }
    if (
      selectedSavedAddressId &&
      savedAddresses.some((address) => address.id === selectedSavedAddressId)
    ) {
      return selectedSavedAddressId;
    }
    return savedAddresses[0]?.id ?? null;
  }, [session, savedAddresses, selectedSavedAddressId]);

  const selectedSavedAddress = useMemo(() => {
    if (!resolvedSavedAddressId || !session.email) return null;
    return getMockSavedAddress(session.email, resolvedSavedAddressId);
  }, [resolvedSavedAddressId, session.email]);

  const continueAsGuest = useCallback(() => {
    const next = authProvider.continueAsGuest();
    setSession(next);
    setSelectedSavedAddressId(null);
  }, [authProvider]);

  const signInWithEmail = useCallback(
    async (credentials: EmailPasswordCredentials) => {
      const next = await authProvider.signInWithEmail(credentials);
      setSession(next);
      const addresses = listMockSavedAddresses(next.email);
      setSelectedSavedAddressId(addresses[0]?.id ?? null);
      return next;
    },
    [authProvider],
  );

  const signOut = useCallback(async () => {
    const next = await authProvider.signOut();
    setSession(next);
    setSelectedSavedAddressId(null);
  }, [authProvider]);

  const signInWithLine = useCallback(async () => {
    return authProvider.signInWithLine();
  }, [authProvider]);

  const selectSavedAddress = useCallback((addressId: string | null) => {
    setSelectedSavedAddressId(addressId);
  }, []);

  const value = useMemo<CustomerSessionContextValue>(
    () => ({
      session,
      customerType: session.customerType,
      customerName: session.customerName,
      email: session.email,
      phone: session.phone,
      isAuthenticated: session.isAuthenticated,
      ready,
      savedAddresses,
      selectedSavedAddressId: resolvedSavedAddressId,
      selectedSavedAddress,
      selectSavedAddress,
      continueAsGuest,
      signInWithEmail,
      signOut,
      signInWithLine,
    }),
    [
      session,
      ready,
      savedAddresses,
      resolvedSavedAddressId,
      selectedSavedAddress,
      selectSavedAddress,
      continueAsGuest,
      signInWithEmail,
      signOut,
      signInWithLine,
    ],
  );

  return (
    <CustomerSessionContext.Provider value={value}>
      {children}
    </CustomerSessionContext.Provider>
  );
}

export function useCustomerSession() {
  const ctx = useContext(CustomerSessionContext);
  if (!ctx) {
    throw new Error(
      "useCustomerSession must be used within CustomerSessionProvider",
    );
  }
  return ctx;
}
