import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { HistoryItem } from "./use-speech-synthesis";

interface UseComposerHistoryNavigationOptions {
  historyItems: HistoryItem[];
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  submitInput: () => void;
}

export function useComposerHistoryNavigation({
  historyItems,
  input,
  setInput,
  submitInput,
}: UseComposerHistoryNavigationOptions) {
  const draftRef = useRef("");
  const [historyNavigationIndex, setHistoryNavigationIndex] = useState<
    number | null
  >(null);
  const activeHistoryNavigationIndex =
    historyNavigationIndex !== null &&
    historyNavigationIndex < historyItems.length
      ? historyNavigationIndex
      : null;

  const resetHistoryNavigation = () => {
    draftRef.current = "";
    setHistoryNavigationIndex(null);
  };

  const handleInputChange = (value: string) => {
    if (activeHistoryNavigationIndex !== null) {
      resetHistoryNavigation();
    }

    setInput(value);
  };

  const handleSubmit = () => {
    resetHistoryNavigation();
    submitInput();
  };

  const handleArrowHistoryNavigate = (direction: "up" | "down") => {
    if (historyItems.length === 0) {
      return false;
    }

    if (direction === "up") {
      const nextIndex =
        activeHistoryNavigationIndex === null
          ? historyItems.length - 1
          : Math.max(0, activeHistoryNavigationIndex - 1);

      if (activeHistoryNavigationIndex === null) {
        draftRef.current = input;
      }

      if (nextIndex === activeHistoryNavigationIndex) {
        return true;
      }

      setHistoryNavigationIndex(nextIndex);
      setInput(historyItems[nextIndex].text);
      return true;
    }

    if (activeHistoryNavigationIndex === null) {
      return false;
    }

    const newestIndex = historyItems.length - 1;

    if (activeHistoryNavigationIndex >= newestIndex) {
      const restoredDraft = draftRef.current;
      resetHistoryNavigation();
      setInput(restoredDraft);
      return true;
    }

    const nextIndex = activeHistoryNavigationIndex + 1;
    setHistoryNavigationIndex(nextIndex);
    setInput(historyItems[nextIndex].text);
    return true;
  };

  return {
    handleArrowHistoryNavigate,
    handleInputChange,
    handleSubmit,
  };
}
