import os
import io, json, time, re, hashlib, fitz, base64
from PIL import Image
from groq import Groq
from dotenv import load_dotenv
import redis
from concurrent.futures import ThreadPoolExecutor
import shutil
import easyocr
import numpy as np

load_dotenv()

CACHE_DIR = "cache"
os.makedirs(CACHE_DIR, exist_ok=True)
print("[CACHE] Ready")

redis_client = None
print("[REDIS] Disabled for testing")

EASYOCR_READER = None

class OCRService:
    def __init__(self):
        global EASYOCR_READER
        if EASYOCR_READER is None:
            print("[EASYOCR] Loading model once...")
            EASYOCR_READER = easyocr.Reader(['en'], gpu=False)
        self.reader = EASYOCR_READER
        print("[EASYOCR] Ready - Using cached model")

        self.api_keys = [os.getenv(f"GROQ_API_KEY_{i}") for i in range(1, 7)]
        self.api_keys = [k for k in self.api_keys if k]
        if not self.api_keys:
            raise ValueError("No GROQ API keys found in.env")

        self.clients = [Groq(api_key=k) for k in self.api_keys]

        self.vision_models = [
            "meta-llama/llama-4-scout-17b-16e-instruct",
            "qwen/qwen3.6-27b"
        ]
        print(f"[VISION MODELS] Available: {self.vision_models}")

        self.key_stats = [{
            'requests': 0,
            'tokens': 0,
            'cooldown_until': 0,
            'rpm': 30,
            'tpm': 6000,
            'errors': 0
        } for _ in self.api_keys]

        self.executor = ThreadPoolExecutor(max_workers=2)
        print(f"[DYNAMIC] Init: {len(self.api_keys)} keys | Max 30 pages/PDF | Workers: 2")

    def _get_best_client_dynamic(self):
        current_time = time.time()
        for idx, stats in enumerate(self.key_stats):
            if stats['cooldown_until'] > 0 and current_time >= stats['cooldown_until']:
                stats['cooldown_until'] = 0
                stats['requests'] = 0
                stats['tokens'] = 0
                stats['errors'] = 0

        available = []
        for idx, stats in enumerate(self.key_stats):
            if stats['cooldown_until'] == 0:
                score = stats['requests'] + (stats['tokens']/100) + (stats['errors']*50)
                available.append((idx, score))

        if not available:
            min_wait = min([s['cooldown_until'] - current_time for s in self.key_stats])
            wait_time = max(0.5, min_wait + 0.1)
            time.sleep(wait_time)
            return self._get_best_client_dynamic()

        available.sort(key=lambda x: x[1])
        best_idx = available[0][0]
        return self.clients[best_idx], best_idx

    def _mark_rate_limited(self, key_idx, error_msg=""):
        retry_after = 60
        if "retry-after" in error_msg.lower():
            match = re.search(r'retry-after[:\s]+(\d+)', error_msg.lower())
            if match:
                retry_after = int(match.group(1))
        self.key_stats[key_idx]['cooldown_until'] = time.time() + retry_after
        self.key_stats[key_idx]['errors'] += 1

    def _update_usage(self, key_idx, tokens_used):
        stats = self.key_stats[key_idx]
        stats['requests'] += 1
        stats['tokens'] += tokens_used

    def _cache_get(self, key):
        path = os.path.join(CACHE_DIR, f"{key.replace(':', '_')}.json")
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                return f.read()
        return None

    def _cache_set(self, key, value, expire=86400):
        path = os.path.join(CACHE_DIR, f"{key.replace(':', '_')}.json")
        with open(path, 'w', encoding='utf-8') as f:
            f.write(value)

    def encode_image_resized(self, image_path, max_size_kb=3500):
        img = Image.open(image_path)
        if img.mode!= 'RGB':
            img = img.convert('RGB')

        quality = 70
        while quality > 20:
            buffer = io.BytesIO()
            img.save(buffer, format='JPEG', quality=quality, optimize=True)
            size_kb = len(buffer.getvalue()) / 1024
            if size_kb < max_size_kb:
                print(f"[IMAGE RESIZE] {os.path.basename(image_path)}: {size_kb:.1f}KB at quality {quality}")
                return base64.b64encode(buffer.getvalue()).decode('utf-8')
            quality -= 10

        w, h = img.size
        img = img.resize((int(w*0.7), int(h*0.7)), Image.LANCZOS)
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG', quality=50, optimize=True)
        print(f"[IMAGE RESIZE] {os.path.basename(image_path)}: {len(buffer.getvalue())/1024:.1f}KB resized")
        return base64.b64encode(buffer.getvalue()).decode('utf-8')

    def pdf_to_image_batches(self, pdf_path, dpi=200, max_pages=30):
        doc = fitz.open(pdf_path)
        total_pages = min(len(doc), max_pages)
        batch_paths = []
        page_texts = []
        scale = dpi / 72
        mat = fitz.Matrix(scale, scale)

        for i in range(total_pages):
            page = doc.load_page(i)
            text = page.get_text().strip()
            page_texts.append(text)
            print(f"[PDF TEXT] Page {i+1} has embedded text: {len(text)} chars")

            pix = page.get_pixmap(matrix=mat, alpha=False)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

            batch_path = os.path.join(CACHE_DIR, f"{os.path.basename(pdf_path)}_page_{i+1}.jpg")
            img.save(batch_path, 'JPEG', quality=85, optimize=True)
            batch_paths.append(batch_path)
            print(f"[PDF2IMG] Page {i+1}/{total_pages} | {pix.width}x{pix.height}")

        doc.close()
        return batch_paths, page_texts

    def get_bboxes_from_easyocr(self, image_path):
        try:
            results = self.reader.readtext(image_path, detail=1, paragraph=False, width_ths=0.7, height_ths=0.7)
            bboxes = []
            for (bbox, text, conf) in results:
                if conf > 0.3:
                    x_coords = [p[0] for p in bbox]
                    y_coords = [p[1] for p in bbox]
                    bboxes.append({
                        'text': text,
                        'left': int(min(x_coords)),
                        'top': int(min(y_coords)),
                        'width': int(max(x_coords) - min(x_coords)),
                        'height': int(max(y_coords) - min(y_coords)),
                        'conf': conf * 100
                    })
            print(f"[EASYOCR BBOX] {len(bboxes)} boxes extracted")
            return bboxes
        except Exception as e:
            print(f"[EASYOCR BBOX ERROR] {e}")
            return []

    def extract_text_with_vision(self, image_path, embedded_text=""):
        garbage_ratio = len(re.findall(r'[^\w\s]', embedded_text)) / len(embedded_text) if embedded_text else 0
        is_garbage = garbage_ratio > 0.30
        has_enough_text = len(embedded_text.strip()) > 100

        print(f"[DEBUG CHECK] File: {os.path.basename(image_path)} | Embedded: {len(embedded_text)} chars | Garbage: {is_garbage} ({garbage_ratio:.2%}) | Enough: {has_enough_text}")

        if embedded_text and has_enough_text and not is_garbage:
            print(f"[EMBEDDED TEXT] Using PDF text: {len(embedded_text)} chars")
            bboxes = self.get_bboxes_from_easyocr(image_path)
            return embedded_text, bboxes

        print(f"[VISION OCR START] Processing: {os.path.basename(image_path)} - Embedded text too short/garbage: {len(embedded_text)} chars")

        img_hash = hashlib.md5(open(image_path, 'rb').read()).hexdigest()
        cache_key = f"vision:img:{img_hash}"
        cached = self._cache_get(cache_key)
        if cached:
            print(f"[CACHE HIT] {image_path}")
            data = json.loads(cached)
            return data['text'], data['bboxes']

        bboxes = self.get_bboxes_from_easyocr(image_path)
        base64_image = self.encode_image_resized(image_path, max_size_kb=3500)

        client, key_idx = self._get_best_client_dynamic()

        prompt = """You are an expert OCR system for handwritten English exam scripts.

CRITICAL TASK: Extract EVERY SINGLE WORD from this handwritten answer sheet. Do NOT summarize.

RULES:
1. Read handwriting VERY CAREFULLY - don't skip faint text.
2. Question numbers: 1. 2. 3. or 1) 2) 3> or Q1 Q2 - keep them exactly.
3. CRITICAL: If you see numbering like 1. 2. 3. or 1) 2) 3) WITHIN a main question, convert to bullet points:
4. Also convert a) b) c) or i) ii) iii) to bullet points (•) within questions.
5. Keep ALL bullet points and full sentences. Don't truncate.
6. If a word is 50% readable, GUESS it from context. Use [?] only if totally unreadable.
7. Preserve line breaks between bullet points.
8.If you see any tables, try to extract text in a readable format, but don't worry about perfect formatting.
9.Check Margins: If text is cut off at the edges, try to guess the missing letters from context.and if pointing within
an answer if in margin, then convert it to a bullet point with the main answer. If you see any text in the margin, try to include it in the main answer as a bullet point.
10. OUTPUT: Only the complete extracted text with all sentences and bullets. No explanations.

EXTRACTED TEXT:"""

        for model_name in self.vision_models:
            try:
                print(f"[VISION TRY] {model_name} | Key {key_idx+1}")
                response = client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": prompt},
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/jpeg;base64,{base64_image}",
                                    },
                                },
                            ],
                        }
                    ],
                    temperature=0,
                    max_completion_tokens=8192,
                    top_p=1,
                    stream=False,
                )
                text = response.choices[0].message.content.strip()
                tokens = response.usage.total_tokens if hasattr(response, 'usage') else len(text)//4
                self._update_usage(key_idx, tokens)
                data = {'text': text, 'bboxes': bboxes}
                self._cache_set(cache_key, json.dumps(data))
                print(f"[VISION SUCCESS] {model_name} | {len(text)} chars | {len(bboxes)} bboxes")
                return text, bboxes
            except Exception as e:
                error_msg = str(e)
                print(f"[VISION ERROR] {model_name}: {error_msg[:200]}")
                if "429" in error_msg or "rate_limit" in error_msg.lower():
                    self._mark_rate_limited(key_idx, error_msg)
                    client, key_idx = self._get_best_client_dynamic()
                    continue
                else:
                    continue

        print(f"[FALLBACK] All Vision models failed")
        return "", bboxes

    def extract_roll_name(self, text, filename=""):
        """✅ 100% DYNAMIC: No Static Pattern, No Blacklist"""
        roll = "NOT_FOUND"
        name = "NOT_FOUND"
        lines = [line.strip() for line in text.split('\n') if line.strip()]

        # 1. Filename থেকে
        fn_match = re.search(r'([0-9]{8,12})', filename)
        if fn_match:
            roll = fn_match.group(1)
            name_match = re.search(r'[0-9]{8,12}[_ -]*([A-Za-z\s]+)', filename)
            if name_match:
                name = name_match.group(1).strip().title()
                print(f"[EXTRACTED] Roll: {roll} | Name: {name} from Filename")
                return roll, name

        # 2. Roll খোঁজো - keyword based only
        roll_patterns = [
            r'(?:University|Univ\.?)\s*roll\s*no[\s\:\-]*(\d{8,12})',
            r'(?:Class|College)\s*roll\s*no[\s\:\-]*(\d{5,12})',
            r'Roll\s*No[\s\:\-]*(\d{8,12})',
            r'Roll[\s\:\-]*(\d{8,12})',
            r'\b(\d{8,12})\b',
        ]

        roll_line_idx = -1
        for idx, line in enumerate(lines):
            for pattern in roll_patterns:
                match = re.search(pattern, line, re.I)
                if match:
                    roll = match.group(1).strip()
                    roll_line_idx = idx
                    break
            if roll!= "NOT_FOUND":
                break

        # 3. Name: Roll এর আগের 1-3 লাইনে। No blacklist
        if roll_line_idx > 0:
            for i in range(max(0, roll_line_idx-3), roll_line_idx):
                candidate = lines[i]
                candidate = re.sub(r'\b(By|Name|Student|Candidate)\b[\s\:\-]*', '', candidate, flags=re.I).strip()
                candidate = re.sub(r'[^A-Za-z\s]', '', candidate).strip()
                words = candidate.split()
                if 2 <= len(words) <= 4 and all(len(w) > 1 for w in words):
                    name = candidate.title()
                    break

        # 4. Fallback
        if name == "NOT_FOUND":
            by_match = re.search(r'\bBy\s+([A-Za-z]+(?:\s+[A-Za-z]+){1,3})', text, re.I)
            if by_match:
                name = by_match.group(1).strip().title()

        print(f"[EXTRACTED] Roll: {roll} | Name: {name}")
        return roll, name

    def process_pdf(self, pdf_path):
        cache_key = f"vision:file:{hashlib.md5(open(pdf_path,'rb').read()).hexdigest()}"
        cached = self._cache_get(cache_key)
        if cached:
            print(f"[CACHE] Full PDF loaded")
            data = json.loads(cached)
            # ✅ Cache থেকেও print
            print("\n" + "="*80)
            print("[STUDENT SCRIPT EXTRACTED FROM CACHE]")
            print("="*80)
            print(data['text'])
            print("="*80 + "\n")
            return data

        print(f"\n{'='*70}\n[START] {os.path.basename(pdf_path)}\n{'='*70}")
        batch_paths, page_texts = self.pdf_to_image_batches(pdf_path, dpi=200, max_pages=30)

        all_text = []
        all_bboxes = []
        for idx, batch_path in enumerate(batch_paths):
            embedded = page_texts[idx] if idx < len(page_texts) else ""
            try:
                print(f"\n{'='*50}")
                print(f"[PAGE {idx+1} START] Processing {os.path.basename(batch_path)}")
                print(f"{'='*50}")

                text, bboxes = self.extract_text_with_vision(batch_path, embedded)

                # ✅ প্রতিটা page এর text console এ print
                print(f"\n[EXTRACTED TEXT PAGE {idx+1}] Length: {len(text)} chars")
                print(f"{'-'*70}")
                print(text)
                print(f"{'-'*70}\n")

                all_text.append(text)
                for bbox in bboxes:
                    bbox['page'] = idx
                all_bboxes.extend(bboxes)
            except Exception as e:
                print(f"[PAGE ERROR] Page {idx+1}: {e}")
                all_text.append("")

        full_text = '\n\n'.join([t for t in all_text if t])

        # ✅ Full script একবারে print
        print(f"\n{'='*80}")
        print(f"[FULL STUDENT SCRIPT EXTRACTED] Total: {len(full_text)} chars")
        print(f"{'='*80}")
        print(full_text)
        print(f"{'='*80}\n")

        filename = os.path.basename(pdf_path)
        roll, name = self.extract_roll_name(full_text, filename)
        image_paths = [f"/cache/{os.path.basename(p)}" for p in batch_paths]

        result = {
            'text': full_text,
            'roll_no': roll,
            'name': name,
            'bboxes': all_bboxes,
            'image_paths': image_paths,
            'page_count': len(batch_paths)
        }

        self._cache_set(cache_key, json.dumps(result))
        print(f"\n[FINAL] {len(full_text)} chars | Roll: {roll} | Name: {name} | BBoxes: {len(all_bboxes)}\n")
        return result

    def process_batch(self, pdf_paths):
        results = []
        for pdf_path in pdf_paths:
            try:
                result = self.process_pdf(pdf_path)
                results.append(result)
            except Exception as e:
                print(f"[BATCH ERROR] {pdf_path}: {e}")
                results.append({'error': str(e), 'file': pdf_path})
        return results
