import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
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

  const resetHistoryNavigation = () => {
    draftRef.current = "";
    setHistoryNavigationIndex(null);
  };

  const handleInputChange = (value: string) => {
    if (historyNavigationIndex !== null) {
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
        historyNavigationIndex === null
          ? historyItems.length - 1
          : Math.max(0, historyNavigationIndex - 1);

      if (historyNavigationIndex === null) {
        draftRef.current = input;
      }

      if (nextIndex === historyNavigationIndex) {
        return true;
      }

      setHistoryNavigationIndex(nextIndex);
      setInput(historyItems[nextIndex].text);
      return true;
    }

    if (historyNavigationIndex === null) {
      return false;
    }

    const newestIndex = historyItems.length - 1;

    if (historyNavigationIndex >= newestIndex) {
      const restoredDraft = draftRef.current;
      resetHistoryNavigation();
      setInput(restoredDraft);
      return true;
    }

    const nextIndex = historyNavigationIndex + 1;
    setHistoryNavigationIndex(nextIndex);
    setInput(historyItems[nextIndex].text);
    return true;
  };

  useEffect(() => {
    if (historyNavigationIndex === null) {
      return;
    }

    if (historyNavigationIndex >= historyItems.length) {
      resetHistoryNavigation();
    }
  }, [historyItems.length, historyNavigationIndex]);

  return {
    handleArrowHistoryNavigate,
    handleInputChange,
    handleSubmit,
  };
}
