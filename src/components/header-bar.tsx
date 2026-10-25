"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { LogOut, Menu, User as UserIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/lib/sidebar-context";

/**
 * The top bar: hamburger + brand mark on the left (toggles the
 * `AppSidebar` overlay drawer), avatar menu on the right with a link to
 * the profile page and sign out.
 */
export function HeaderBar() {
  const router = useRouter();
  const { toggle } = useSidebar();
  const { data: session } = useSession();

  const initial = session?.user?.name?.charAt(0).toUpperCase() || "?";

  return (
    <header className="grid h-16 shrink-0 grid-cols-[auto_1fr_auto] items-center gap-4 border-b-2 border-border/60 bg-background px-4 sm:px-6">
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          title="Toggle sidebar"
          onClick={toggle}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/dashboard" title="FinTracker" className="truncate text-sm font-bold">
          FinTracker
        </Link>
      </div>

      <div />

      <div className="flex shrink-0 items-center gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground"
            >
              {initial}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <p className="truncate px-2 py-2 text-sm font-semibold">
              {session?.user?.name}
            </p>
            <p className="truncate px-2 pb-2 text-xs text-muted-foreground">
              {session?.user?.email}
            </p>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/profile")} className="gap-3">
              <UserIcon className="h-4 w-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => void signOut({ callbackUrl: "/login" })}
              className="gap-3"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
