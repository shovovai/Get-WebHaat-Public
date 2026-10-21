"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function UnsubscribeForm({ initialEmail, token }: { initialEmail: string; token: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setState("loading");
    try {
      const res = await fetch("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token }),
      });
      const data = await res.json();
      setState(res.ok ? "done" : "error");
      setMessage(res.ok ? data.message || "You have been unsubscribed." : data.error);
    } catch {
      setState("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  if (state === "done") {
    return <p className="rounded-lg bg-green-50 p-4 text-sm text-green-700">{message}</p>;
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
      />
      {state === "error" && <p className="text-sm text-red-600">{message}</p>}
      <Button type="submit" disabled={state === "loading"} className="w-full">
        {state === "loading" ? "Unsubscribing..." : "Unsubscribe"}
      </Button>
    </form>
  );
}
