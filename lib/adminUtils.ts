// Admin utility functions
//
// Admin emails come from ADMIN_EMAILS (server-only, never sent to the browser).
// NEXT_PUBLIC_ADMIN_EMAIL is still read as a fallback for existing installs, but every
// NEXT_PUBLIC_* value is copied into the client JavaScript bundle — so with it set, anyone can
// read the admin addresses. Move the list to ADMIN_EMAILS and delete NEXT_PUBLIC_ADMIN_EMAIL.
// Real access checks always run on the server (lib/adminAuth.ts).
export const getAdminEmails = (): string[] => {
  const adminEmailsEnv = process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  if (!adminEmailsEnv) return [];

  try {
    // Handle array format: [email1,email2] or just comma-separated: email1,email2
    const cleanEmails = adminEmailsEnv
      .replace(/[\[\]]/g, "") // Remove brackets if present
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.length > 0);

    return cleanEmails;
  } catch (error) {
    console.error("Error parsing admin emails:", error);
    return [];
  }
};

export const isUserAdmin = (userEmail: string | null | undefined): boolean => {
  if (!userEmail) return false;

  const adminEmails = getAdminEmails();
  return adminEmails.includes(userEmail.toLowerCase());
};

/**
 * UI-only hint (shows admin links). Real access is enforced on the server.
 * In the browser this only works on legacy installs that still set NEXT_PUBLIC_ADMIN_EMAIL;
 * with ADMIN_EMAILS it returns false client-side (admins open /admin directly).
 */
export const useIsAdmin = (userEmail: string | null | undefined): boolean => {
  return isUserAdmin(userEmail);
};
