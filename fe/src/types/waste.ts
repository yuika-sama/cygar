export interface Recipe {
  id: number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
}

export interface WasteItem {
  id: string;
  name: string;
  type: 'Plastic' | 'Paper' | 'Metal' | 'Glass';
  confidence: number;
  image: string;
  recipes: Recipe[];
}
