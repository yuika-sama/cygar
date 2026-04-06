import { useState } from "react";

export interface RecognitionResult {
  id: string;
  fileName: string;
  material: string;
  confidence: number;
  imageUrl: string;
}

export function useRecognitionSession() {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<RecognitionResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simulate API call for recognition
  const analyzeFiles = async (inputFiles: File[]) => {
    setLoading(true);
    setError(null);
    setFiles(inputFiles);
    try {
      // TODO: Replace with real API call
      await new Promise((r) => setTimeout(r, 1200));
      const nextResults = inputFiles.map((file, idx) => ({
        id: String(idx + 1),
        fileName: file.name,
        material: ["Plastic", "Paper", "Metal"][idx % 3],
        confidence: Math.round(80 + Math.random() * 20),
        imageUrl: URL.createObjectURL(file),
      }));
      setResults(nextResults);
      return nextResults;
    } catch (e) {
      setError("Nhận diện thất bại");
      setResults(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { files, setFiles, results, loading, error, analyzeFiles };
}
