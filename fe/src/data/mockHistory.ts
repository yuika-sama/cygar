import type { WasteItem } from '../types/waste';

export const MOCK_HISTORY: WasteItem[] = [
  {
    id: '1',
    name: 'Chai nhựa PET',
    type: 'Plastic',
    confidence: 0.98,
    image: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=400',
    recipes: [
      {
        id: 1,
        title: 'Chậu hoa treo',
        difficulty: 'Easy',
        description: 'Cắt đôi chai nhựa...'
      }
    ]
  }
];
