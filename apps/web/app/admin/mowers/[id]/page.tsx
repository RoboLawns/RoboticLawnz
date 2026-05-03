"use client";

import { use, useEffect, useState } from "react";

import { MowerForm } from "@/components/admin/mower-form";
import { ApiError } from "@/lib/api";
import { getAdminMower } from "@/lib/admin-client";
import { useApiAuth } from "@/lib/use-api-auth";
import type { Mower } from "@zippylawnz/shared-types";

export default function AdminEditMowerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const getToken = useApiAuth();
  const [mower, setMower] = useState<Mower | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAdminMower(id, getToken)
      .then((m) => !cancelled && setMower(m))
      .catch((e) => {
        if (cancelled) return;
        setError(
          e instanceof ApiError && e.status === 403
            ? "Your account doesn't have admin access."
            : e instanceof ApiError
              ? e.message
              : "Couldn't load mower.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [id, getToken]);

  if (error) {
    return (
      <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">
        {error}
      </p>
    );
  }
  if (!mower) {
    return <div className="h-32 animate-pulse rounded-xl bg-stone-200" />;
  }
  return <MowerForm mode="edit" initial={mower} />;
}
