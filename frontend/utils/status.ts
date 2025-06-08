export type DatabaseStatus = "online" | "offline" | "unknown";

/**
 * Get the color for the database status indicator
 */
export const getStatusColor = (status: DatabaseStatus): string => {
  switch (status) {
    case "online":
      return "#4CAF50";
    case "offline":
      return "#FF9800";
    default:
      return "#9E9E9E";
  }
};

/**
 * Get the text label for the database status
 */
export const getStatusText = (status: DatabaseStatus): string => {
  switch (status) {
    case "online":
      return "Online";
    case "offline":
      return "Offline";
    default:
      return "Checking...";
  }
};
