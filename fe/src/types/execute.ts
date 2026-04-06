export interface DetectedObject {
  label: string;
  confidence: number;
  bbox?: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
}

export interface ExecuteImage {
  original_name?: string;
  converted_name?: string;
  image_url?: string;
  detected_objects?: DetectedObject[];
}

export interface RecommendedRecipe {
  title?: string;
  link?: string;
  favorites?: number;
  view?: number;
  matched_labels?: string[];
}

export interface ExecuteResponse {
  status?: string;
  execution_id?: string;
  session_id?: string;
  session_name?: string;
  detection_result?: {
    detected_labels?: string[];
    label_frequency?: Record<string, number>;
    images?: ExecuteImage[];
  };
  recommendation_result?: {
    recipes?: RecommendedRecipe[];
    by_label?: Record<string, unknown>;
  };
}
