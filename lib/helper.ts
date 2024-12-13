// A helper function to format the date in the required format
export const formatDate = (date: Date | undefined): string => {
  if (!date) return "";
  return date.toISOString().split("T")[0];
};
