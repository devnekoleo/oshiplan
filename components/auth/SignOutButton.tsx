"use client";

import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/Button";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="secondary" size="sm">
        ログアウト
      </Button>
    </form>
  );
}
