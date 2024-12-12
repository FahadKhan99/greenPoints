import { useState, useEffect } from "react";

export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);

    // Set the initial state
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    // Event listener to handle changes
    const listener = () => setMatches(media.matches);
    media.addEventListener("change", listener);

    // Cleanup
    return () => media.removeEventListener("change", listener);
  }, [query, matches]); // Re-run effect if query or matches changes

  return matches;
};
