import { NextResponse } from "next/server";

// Retired endpoint: nothing in the app calls it and the old version trusted
// client-supplied user ids/amounts. Safe to delete this file.
const gone = () => NextResponse.json({ error: "This endpoint has been removed" }, { status: 410 });

export const POST = gone;
