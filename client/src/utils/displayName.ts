// Helper function to get the best display name for a user
export const getDisplayName = (
  user: { username?: string; displayName?: string } | null
): string => {
  if (!user) return "";
  return user.displayName || user.username || "";
};

// Helper function to get the best display name or fallback
export const getDisplayNameWithFallback = (
  user: { username?: string; displayName?: string } | null,
  fallback: string = "Guest"
): string => {
  if (!user) return fallback;
  return user.displayName || user.username || fallback;
};
