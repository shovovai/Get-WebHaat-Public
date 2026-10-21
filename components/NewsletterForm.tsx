"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import TurnstileWidget, { TURNSTILE_SITE_KEY } from "@/components/TurnstileWidget";

const NewsletterForm = ({ tone = "light" }: { tone?: "light" | "dark" | "clay" | "pill" }) => {
  const pill = tone === "pill";
  const dark = tone === "dark";
  const clay = tone === "clay";
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // Hidden honeypot (bots fill it) and the optional Turnstile token
  const [website, setWebsite] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset message
    setMessage(null);

    // Basic validation
    if (!email.trim()) {
      setMessage({
        type: "error",
        text: "Please enter your email address",
      });
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setMessage({
        type: "error",
        text: "Please enter a valid email address",
      });
      return;
    }

    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setMessage({ type: "error", text: "Please complete the security check first." });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim().toLowerCase(), website, turnstileToken }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: "success",
          text:
            data.message ||
            "Thank you for subscribing! Check your email for a welcome message.",
        });
        setEmail(""); // Clear input on success
      } else {
        // Check if already subscribed
        if (data.alreadySubscribed) {
          setMessage({
            type: "info",
            text:
              data.error ||
              "You're already subscribed to our newsletter! Check your inbox for our latest updates.",
          });
        } else {
          setMessage({
            type: "error",
            text: data.error || "Failed to subscribe. Please try again.",
          });
        }
      }
    } catch (error) {
      console.error("Newsletter subscription error:", error);
      setMessage({
        type: "error",
        text: "Something went wrong. Please try again later.",
      });
    } finally {
      setIsLoading(false);
      // Turnstile tokens are single-use: get a fresh widget for the next attempt
      if (TURNSTILE_SITE_KEY) {
        setTurnstileToken("");
        setTurnstileKey((k) => k + 1);
      }
    }
  };

  return (
    <div className="space-y-3">
      <form
        onSubmit={handleSubmit}
        className={
          pill
            ? "flex items-center gap-2 rounded-full border border-ink/80 bg-white p-1.5 transition-shadow focus-within:shadow-[0_0_0_3px_rgba(0,0,0,0.08)]"
            : "flex flex-col gap-2 sm:flex-row"
        }
      >
        <input
          type="text"
          name="website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute -left-[9999px] h-px w-px overflow-hidden opacity-0"
        />
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          aria-label="Email address"
          className={`w-full flex-1 disabled:cursor-not-allowed disabled:opacity-60 transition-all ${
            pill
              ? "min-w-0 rounded-full bg-transparent px-4 py-2.5 text-base text-ink placeholder:text-ink/40 focus:outline-none sm:px-5"
              : "rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay"
          } ${
            pill
              ? ""
              : dark
              ? "bg-white/10 text-cream placeholder:text-cream/50 border border-white/15"
              : clay
                ? "bg-white text-ink placeholder:text-light-text border border-transparent focus:ring-ink"
                : "bg-white text-ink placeholder:text-light-text border border-border"
          }`}
        />
        <button
          type="submit"
          disabled={isLoading}
          className={`shrink-0 ${pill ? "h-11 rounded-full px-6 text-[15px] sm:h-12 sm:px-9 sm:text-base" : "rounded-md px-6 py-3 text-sm"} font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2 ${
            dark ? "bg-white text-ink hover:bg-white/90" : "bg-ink text-white hover:bg-black"
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Subscribing...
            </>
          ) : (
            "Subscribe"
          )}
        </button>
      </form>

      <TurnstileWidget key={turnstileKey} onToken={setTurnstileToken} theme={dark ? "dark" : "light"} />

      {/* Message Display */}
      {message && (
        <div
          className={`p-3 rounded-lg text-sm flex items-start gap-2 animate-in fade-in slide-in-from-top-2 duration-300 ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : message.type === "info"
              ? "bg-blue-50 text-blue-800 border border-blue-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.type === "success" && (
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          )}
          {message.type === "error" && (
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          )}
          {message.type === "info" && (
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          )}
          <span className="flex-1">{message.text}</span>
        </div>
      )}
    </div>
  );
};

export default NewsletterForm;
