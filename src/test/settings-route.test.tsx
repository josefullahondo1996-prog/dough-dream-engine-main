import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";

vi.mock("../contexts/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../contexts/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
    isLoading: false,
    session: null,
    profile: null,
    restaurant: { id: "restaurant-1", name: "Mi restaurante", slug: "mi-restaurante" },
    membership: { id: "member-1", role: "admin" },
    workspaceError: null,
    refreshWorkspace: vi.fn(),
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  }),
}));

beforeEach(() => {
  window.history.pushState({}, "", "/ajustes");
});

describe("App settings route", () => {
  it("renders the restaurant settings screen instead of the fallback placeholder", () => {
    render(<App />);

    expect(screen.getByText("Ajustes del restaurante")).toBeInTheDocument();
  });
});
