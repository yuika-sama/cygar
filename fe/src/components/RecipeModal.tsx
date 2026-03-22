import { X } from 'lucide-react';
import type { Recipe } from '../types/waste';

interface RecipeModalProps {
  recipe: Recipe;
  onClose: () => void;
}

export default function RecipeModal({ recipe, onClose }: RecipeModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-bold">{recipe.title}</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
              <X />
            </button>
          </div>
          <div className="aspect-video bg-slate-200 rounded-2xl mb-6 flex items-center justify-center italic text-slate-500">
            [Video hướng dẫn tái chế]
          </div>
          <div className="space-y-4">
            <p className="text-slate-600 leading-relaxed">{recipe.description}</p>
            <h4 className="font-bold">Nguyên liệu cần:</h4>
            <ul className="list-disc list-inside text-slate-600">
              <li>1 Chai nhựa PET 1.5L</li>
              <li>Kéo, súng bắn keo</li>
              <li>Dây thừng trang trí</li>
            </ul>
          </div>
          <button className="w-full mt-8 bg-green-600 text-white py-4 rounded-2xl font-bold">Lưu vào yêu thích</button>
        </div>
      </div>
    </div>
  );
}
