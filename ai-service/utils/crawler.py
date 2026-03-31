import time
import json
import pandas as pd
import requests
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager


class InstructablesScraper:
    def __init__(self):
        self.base_url = "https://www.instructables.com"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
        }
        self.project_links = set()
        self.final_data = []

    def collect_links(self, category_url, scroll_count=1):
        """Sử dụng Selenium để xử lý Infinite Scroll và lấy URL bài viết"""
        print(f"--- Đang khởi động Selenium để lấy link từ: {category_url} ---")
        chrome_options = Options()
        # chrome_options.add_argument("--headless") # Bỏ comment dòng này nếu bạn không muốn hiện cửa sổ Chrome lên

        driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
        driver.get(category_url)
        time.sleep(3)  # Đợi trang web load lần đầu

        try:
            for i in range(scroll_count):
                driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                print(f"Cuộn trang lần {i + 1}/...")
                time.sleep(2)  # Đợi dữ liệu AJAX load về

                # CẬP NHẬT QUAN TRỌNG:
                # Tìm các thẻ <a> có class chứa chuỗi "_title_" (vd: _title_wrqdk_47)
                elements = driver.find_elements(By.CSS_SELECTOR, "a[class*='_title_']")

                for elem in elements:
                    try:
                        href = elem.get_attribute("href")
                        # Selenium tự động chuyển href="/..." thành "https://www.instructables.com/..."
                        if href and self.base_url in href:
                            self.project_links.add(href)
                    except Exception as e:
                        continue

            print(f"Tổng cộng tìm thấy {len(self.project_links)} link dự án (Đã lọc trùng).")
        finally:
            driver.quit()

    def scrape_detail(self, url):
        """Sử dụng Requests + BeautifulSoup để lấy nội dung chi tiết"""
        try:
            res = requests.get(url, headers=self.headers, timeout=10)
            soup = BeautifulSoup(res.content, 'html.parser')

            title = soup.find('h1', class_='header-title').text.strip() if soup.find('h1',
                                                                                     class_='header-title') else "N/A"

            # Lấy nguyên liệu (Supplies)
            supplies = []
            supplies_section = soup.find('section', id='step0')
            if supplies_section:
                items = supplies_section.find_all(['li', 'p'])
                supplies = [it.get_text().strip() for it in items if len(it.get_text().strip()) > 2]

            # Lấy hướng dẫn (Instructions)
            steps_text = []
            steps = soup.find_all('section', class_='step')
            for step in steps:
                body = step.find('div', class_='step-body')
                if body:
                    steps_text.append(body.get_text().strip())

            return {
                "title": title,
                "url": url,
                "materials": " | ".join(supplies),
                "instructions": " ".join(steps_text)
            }
        except Exception as e:
            print(f"Lỗi khi cào {url}: {e}")
            return None

    def save_results(self, filename="recycling_data"):
        if not self.final_data:
            print("Không có dữ liệu để lưu!")
            return

        df = pd.DataFrame(self.final_data)
        df.to_csv(f"{filename}.csv", index=False, encoding='utf-8-sig')
        with open(f"{filename}.json", "w", encoding='utf-8') as f:
            json.dump(self.final_data, f, ensure_ascii=False, indent=4)
        print(f"\n--- Đã lưu dữ liệu thành công vào {filename}.csv và {filename}.json ---")

    def start(self, category_path, scroll_limit=10):
        # 1. Lấy link
        self.collect_links(f"{self.base_url}{category_path}", scroll_count=scroll_limit)

        # 2. Cào chi tiết
        if not self.project_links:
            print("Không tìm thấy link nào. Vui lòng kiểm tra lại cấu trúc web hoặc đường truyền mạng.")
            return

        print("\n--- Bắt đầu lấy nội dung chi tiết từng dự án ---")
        for i, url in enumerate(list(self.project_links)):
            print(f"[{i + 1}/{len(self.project_links)}] Đang xử lý: {url}")
            data = self.scrape_detail(url)
            if data:
                self.final_data.append(data)
            time.sleep(1.5)  # Nghỉ để tránh bị chặn IP

        # 3. Lưu file
        self.save_results()


# --- CHẠY CHƯƠNG TRÌNH ---
if __name__ == "__main__":
    scraper = InstructablesScraper()
    # Chạy thử với 3 lần cuộn trang để test nhé
    scraper.start(category_path="/craft/projects/", scroll_limit=1)