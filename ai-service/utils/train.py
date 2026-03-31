import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import joblib
import os


class OptimizedRecyclingRecommender:
    def __init__(self, model_dir='models'):
        self.vectorizer = TfidfVectorizer(stop_words='english', max_features=10000)  # Giới hạn từ vựng để nhẹ RAM
        self.tfidf_matrix = None
        self.df = None
        self.model_dir = model_dir

        # Tạo thư mục lưu model nếu chưa có
        if not os.path.exists(self.model_dir):
            os.makedirs(self.model_dir)

        self.vectorizer_path = os.path.join(self.model_dir, 'vectorizer.pkl')
        self.matrix_path = os.path.join(self.model_dir, 'tfidf_matrix.pkl')
        self.data_path = os.path.join(self.model_dir, 'processed_data.pkl')

        self.material_mapping = {
            'ALU': 'aluminum alu cans metal',
            'GLASS': 'glass bottle jar',
            'PET': 'pet plastic bottle',
            'Battery': 'battery batteries',
            'Medicine': 'medicine pill',
            'Metal': 'metal steel iron',
            'cardboard': 'cardboard box carton paper',
            'food_waste': 'food waste compost organic',
            'plastic_bags': 'plastic bag bags',
            'plastic_bottle': 'plastic bottle water bottle'
        }

    def load_and_preprocess_data(self, file_paths):
        """Tối ưu bằng Pandas Vectorization"""
        print("Đang đọc và xử lý dữ liệu mới...")
        dataframes = [pd.read_csv(path) for path in file_paths if os.path.exists(path)]

        if not dataframes:
            raise ValueError("Không có file dữ liệu hợp lệ.")

        self.df = pd.concat(dataframes, ignore_index=True)
        self.df.fillna({'Project-Title': '', 'Subcategory': '', 'Views': '0', 'Favorites': '0'}, inplace=True)

        # Tối ưu: Dùng vector hóa chuỗi của Pandas thay vì apply/lambda
        self.df['Views'] = pd.to_numeric(self.df['Views'].astype(str).str.replace(',', ''), errors='coerce').fillna(0)
        self.df['Favorites'] = pd.to_numeric(self.df['Favorites'].astype(str).str.replace(',', ''),
                                             errors='coerce').fillna(0)

        # Tối ưu: Nối chuỗi và viết thường hàng loạt
        self.df['text_features'] = (self.df['Project-Title'] + ' ' + self.df['Subcategory']).astype(str).str.lower()

    def train_or_load_model(self, file_paths=None, force_retrain=False):
        """Nếu đã có model lưu trữ, load lên ngay. Nếu chưa có hoặc ép buộc, sẽ train lại."""
        if not force_retrain and os.path.exists(self.vectorizer_path) and os.path.exists(self.matrix_path):
            print("Đang load mô hình đã train từ bộ nhớ tạm (Cache)...")
            self.vectorizer = joblib.load(self.vectorizer_path)
            self.tfidf_matrix = joblib.load(self.matrix_path)
            self.df = joblib.load(self.data_path)
            print("Load mô hình thành công! Siêu tốc.")
        else:
            if file_paths is None:
                raise ValueError("Cần cung cấp file_paths để train model mới.")

            self.load_and_preprocess_data(file_paths)
            print("Đang huấn luyện mô hình TF-IDF mới...")
            self.tfidf_matrix = self.vectorizer.fit_transform(self.df['text_features'])

            print("Đang lưu mô hình xuống ổ cứng...")
            joblib.dump(self.vectorizer, self.vectorizer_path)
            joblib.dump(self.tfidf_matrix, self.matrix_path)
            joblib.dump(self.df, self.data_path)
            print("Huấn luyện và lưu trữ hoàn tất!")

    def recommend(self, material_class, top_n=5):
        """Giữ nguyên logic Cosine Similarity"""
        if self.tfidf_matrix is None:
            raise Exception("Model chưa sẵn sàng.")

        search_query = self.material_mapping.get(material_class, material_class).lower()
        query_vector = self.vectorizer.transform([search_query])

        cosine_similarities = cosine_similarity(query_vector, self.tfidf_matrix).flatten()
        related_docs_indices = cosine_similarities.argsort()[:-top_n - 1:-1]
        valid_indices = [i for i in related_docs_indices if cosine_similarities[i] > 0]

        results = []
        for i in valid_indices:
            row = self.df.iloc[i]
            results.append({
                "title": row['Project-Title'],
                "link": f"https://instructables.com{row['Instructables-link']}",
                "view": int(row['Views']),
                "lượt yêu thích": int(row['Favorites'])
            })

        return sorted(results, key=lambda x: (x['lượt yêu thích'], x['view']), reverse=True)


# Cách dùng
if __name__ == "__main__":
    recommender = OptimizedRecyclingRecommender()
    file_paths = ['dataset/projects_craft.csv', 'dataset/projects_workshop.csv']

    # Lần chạy ĐẦU TIÊN (hoặc khi có data mới CSV mới): Đặt force_retrain=True
    # Lần chạy THỨ HAI trở đi: Đặt force_retrain=False, model sẽ load trong chớp mắt.
    recommender.train_or_load_model(file_paths, force_retrain=False)

    test_materials_list = ['cardboard', 'PET']
    for material in test_materials_list:
        print(f"\n--- Gợi ý cho: {material} ---")
        for idx, rec in enumerate(recommender.recommend(material, top_n=5), 1):
            print(f"{idx}. {rec['title']} (Fav: {rec['lượt yêu thích']}) Link: {rec['link']}")