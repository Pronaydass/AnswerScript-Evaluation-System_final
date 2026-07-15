import re
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import nltk
from nltk.tokenize import word_tokenize, sent_tokenize
from nltk.stem import WordNetLemmatizer
from nltk.corpus import stopwords
from collections import Counter, defaultdict
import os

os.environ['TOKENIZERS_PARALLELISM'] = 'false'

def download_nltk_resources():
    resources = ['punkt', 'wordnet', 'stopwords']
    for name in resources:
        try:
            if name == 'punkt':
                nltk.data.find('tokenizers/punkt')
            else:
                nltk.data.find(f'corpora/{name}')
        except LookupError:
            nltk.download(name, quiet=True)

download_nltk_resources()

class EvalService:
    def __init__(self):
        self.sbert = None
        self.lemmatizer = WordNetLemmatizer()
        self.stop_words = set(stopwords.words('english'))
        self.stop_words.update(['এর', 'এবং', 'ও', 'তে', 'থেকে', 'জন্য', 'সাথে', 'কি', 'যে', 'এই', 'একটি', 'করে', 'হয়', 'হল'])
        print("Dynamic Evaluator Ready - No Static Keywords - All Pages Marking")

    def _load_sbert(self):
        if self.sbert is None:
            from sentence_transformers import SentenceTransformer
            print("Loading Multilingual SBERT...")
            try:
                self.sbert = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
                print("SBERT Ready")
            except Exception as e:
                print(f"[NLP] SBERT load failed: {e}")
                self.sbert = None
        return self.sbert

    def _to_english_num(self, num_str):
        bn_map = {'০':'0','১':'1','২':'2','৩':'3','৪':'4','৫':'5','৬':'6','৭':'7','৮':'8','৯':'9'}
        return ''.join([bn_map.get(d, d) for d in num_str])

    def _extract_keywords_dynamic(self, text, top_n=25):
        if not text or len(text) < 10:
            return []

        text_clean = re.sub(r'\d+', '', text)
        text_clean = re.sub(r'[^\w\s]', ' ', text_clean.lower())
        tokens = word_tokenize(text_clean)
        tokens = [w for w in tokens if len(w) > 3 and w not in self.stop_words]

        if not tokens:
            return []

        word_freq = Counter(tokens)
        freq_keywords = [word for word, cnt in word_freq.most_common(top_n)]
        lemma_keywords = [self.lemmatizer.lemmatize(w) for w in tokens if len(w) > 4]

        bigrams = []
        for i in range(len(tokens)-1):
            if len(tokens[i]) > 3 and len(tokens[i+1]) > 3:
                bigrams.append(f"{tokens[i]} {tokens[i+1]}")

        trigrams = []
        for i in range(len(tokens)-2):
            if len(tokens[i]) > 3 and len(tokens[i+1]) > 3 and len(tokens[i+2]) > 3:
                trigrams.append(f"{tokens[i]} {tokens[i+1]} {tokens[i+2]}")

        all_keywords = list(dict.fromkeys(freq_keywords + lemma_keywords + bigrams + trigrams))
        print(f"[KEYWORD EXTRACT DYNAMIC] Found {len(all_keywords)} keywords: {all_keywords[:15]}")
        return all_keywords[:top_n]

    def extract_rubric_from_qp(self, qp_text):
        print(f"\n{'='*80}")
        print(f"[QP PARSER UNIVERSAL] Input: {len(qp_text)} chars")
        print(f"{'='*80}\n")

        full_match = re.search(r'(?:Full|Total|Maximum|Max\.?|পূর্ণমান|মোট)\s*(?:Marks?|নম্বর)?[\s\:\-]*([0-9০-৯]+)', qp_text, re.I)
        full_marks = int(self._to_english_num(full_match.group(1))) if full_match else None
        if full_marks:
            print(f"[QP] Full Marks: {full_marks}")

        qp_text = re.sub(r'(Faculty|Subject|Date|Time|Course Outcome|Topic|Contents|Instructions|Bloom.*?Level|Page\s*\d+\s*of\s*\d+|Q\.?\s*No\.?).*?(?=1\.|Question\s*\d|Q\s*\d|\d+[\.\)])', '', qp_text, flags=re.DOTALL|re.I)
        qp_text = re.sub(r'ASSIGNMENT[-\s]*\d+.*?\n', '', qp_text, flags=re.I)

        q_rubric = {}

        blocks = re.split(r'(?=Question\s+\d+)', qp_text, flags=re.I)
        blocks = [b.strip() for b in blocks if b.strip() and re.search(r'Question\s+\d+', b, re.I)]

        if not blocks:
            blocks = re.split(r'(?=Q\s*\d+[\.\)])', qp_text)
            blocks = [b.strip() for b in blocks if b.strip() and re.search(r'Q\s*\d+[\.\)]', b)]

        if not blocks:
            blocks = re.split(r'(?=^\s*\d+[\.\)]\s+)', qp_text, flags=re.M)
            blocks = [b.strip() for b in blocks if b.strip() and re.match(r'^\s*\d+[\.\)]\s+', b)]

        if not blocks:
            raise ValueError("❌ Question detect করতে পারিনি")

        print(f"[MATCHED] Found {len(blocks)} question blocks")

        for block in blocks:
            q_num_match = re.search(r'(?:Question|Q)\s*(\d+)', block, re.I)
            if not q_num_match:
                q_num_match = re.search(r'^\s*(\d+)[\.\)]', block)

            if not q_num_match:
                continue

            q_num = self._to_english_num(q_num_match.group(1))

            marks_match = re.search(r'\[(\d+)\s*Marks?\]', block, re.I) # [5 Marks] এর জন্য
            if marks_match:
                marks = int(marks_match.group(1))
            else:
                marks_match = re.search(r'(\d+)\s*$', block, re.M) # লাইন এর শেষের number এর জন্য
                marks = int(marks_match.group(1)) if marks_match else 5
            q_text = re.sub(r'Question\s+\d+\s*\n?\s*[\[\(]\s*\d{1,2}\s*Marks?\s*[\]\)]\s*\n*', '', block, flags=re.I)
            q_text = re.sub(r'Q\s*\d+[\.\)]\s*', '', q_text, flags=re.I)
            q_text = re.sub(r'^\s*\d+[\.\)]\s*', '', q_text)
            q_text = re.sub(r'\[\d+\s*Marks?\]', '', q_text, flags=re.I)
            q_text = re.sub(r'\(Understanding Level\)', '', q_text, flags=re.I)
            q_text = re.sub(r'\(Bloom.*?Level\)', '', q_text, flags=re.I)
            q_text = re.sub(r'\n+', ' ', q_text)
            q_text = re.sub(r'(\d+)\s*$', '', q_text) # এটা new line add করো            q_text = re.sub(r'^[\-\•\:]+', '', q_text)
            q_text = q_text.strip()

            if len(q_text) < 10:
                continue

            keywords = self._extract_keywords_dynamic(q_text, top_n=20)

            q_rubric[f"Q{q_num}"] = {
                'marks': marks,
                'text': q_text[:500],
                'keywords': keywords
            }
            print(f"[FOUND] Q{q_num}: {marks} marks | {q_text[:60]}...")

        if not q_rubric:
            raise ValueError("❌ Valid Question পেলাম না")

        total = sum([v['marks'] for v in q_rubric.values()])

        if full_marks and total!= full_marks:
            diff = full_marks - total
            last_q = list(q_rubric.keys())[-1]
            q_rubric[last_q]['marks'] += diff
            total = full_marks
            print(f"[ADJUST] Last question +{diff} marks")

        print(f"\n[QP RUBRIC FINAL] {len(q_rubric)} questions | Total: {total}\n")
        return q_rubric, total

    def split_into_questions(self, student_text, qp_rubric=None):
        student_text = student_text.strip()
        print(f"\n{'='*80}")
        print(f"[SPLIT START] Student text: {len(student_text)} chars")
        print(f"{'='*80}\n")

        questions = defaultdict(list)
        valid_q_nums = []
        if qp_rubric:
            valid_q_nums = sorted([int(q[1:]) for q in qp_rubric.keys()])
            print(f"[SPLIT] Valid Questions from QP: {valid_q_nums}")

        pattern = r'(?:^|\n)\s*(?:Q(?:uestion)?\s*)?(\d+)[\.\)>]\s+'
        parts = re.split(pattern, student_text, flags=re.I | re.M)

        if len(parts) > 2:
            current_q = None
            for i in range(1, len(parts)):
                if i % 2 == 1:
                    current_q = f"Q{parts[i].strip()}"
                else:
                    if current_q:
                        content = parts[i].strip()
                        content = re.sub(r'^(?:Ans|Answer)\s*[:\-]+\s*', '', content, flags=re.I)
                        if len(content) > 20:
                            questions[current_q].append(content)

        if not questions or all(len(''.join(v)) < 100 for v in questions.values()):
            print("[SPLIT] Trying ASSIGNMENT format")
            assign_match = re.search(r'ASSIGNMENT[\-\s]*\d+.*?\n', student_text, re.I)
            if assign_match:
                text_after = student_text[assign_match.end():]
                parts2 = re.split(r'(?:^|\n)\s*(\d+)[\.\)]\s+', text_after, flags=re.M)
                if len(parts2) > 2:
                    questions = defaultdict(list)
                    current_q = None
                    for i in range(1, len(parts2)):
                        if i % 2 == 1:
                            current_q = f"Q{parts2[i].strip()}"
                        else:
                            if current_q:
                                content = parts2[i].strip()
                                content = re.sub(r'^(?:Ans|Answer)\s*[:\-]+\s*', '', content, flags=re.I)
                                if len(content) > 20:
                                    questions[current_q].append(content)

        final_questions = {}
        for q_key, content_list in questions.items():
            full_content = '\n'.join(content_list)
            if len(full_content) > 50 and (not qp_rubric or q_key in qp_rubric):
                final_questions[q_key] = full_content
                print(f"[SPLIT] {q_key}: {len(full_content)} chars")

        if len(final_questions) < len(valid_q_nums) and qp_rubric:
            print("[SPLIT] Trying keyword based mapping")
            text_lower = student_text.lower()

            for q_key, q_info in qp_rubric.items():
                if q_key in final_questions:
                    continue

                q_keywords = [w for w in q_info['keywords'][:5] if len(w) > 4]
                start = -1
                for kw in q_keywords:
                    pos = text_lower.find(kw.lower())
                    if pos!= -1:
                        start = pos
                        break

                if start!= -1:
                    end = len(student_text)
                    for other_q, other_info in qp_rubric.items():
                        if other_q!= q_key:
                            other_kw = [w for w in other_info['keywords'][:3] if len(w) > 4]
                            for okw in other_kw:
                                opos = text_lower.find(okw.lower(), start + 50)
                                if opos!= -1 and opos < end:
                                    end = opos

                    q_text = student_text[start:end].strip()
                    if len(q_text) > 50:
                        final_questions[q_key] = q_text
                        print(f"[SPLIT] {q_key} Keyword: {len(q_text)} chars")

        print(f"[SPLIT DEBUG] Found {len(final_questions)} question blocks")
        for q, text in final_questions.items():
            print(f"[SPLIT] {q}: {len(text)} chars")

        print(f"[QUESTIONS NLP] Final: {sorted(final_questions.keys())}\n")
        return final_questions

    def extract_answers_from_model(self, model_text, valid_q, qp_rubric):
        answers = {}
        print(f"\n{'='*80}")
        print(f"[MODEL EXTRACT] Valid Q: {list(valid_q)}")
        print(f"[MODEL EXTRACT] Model Text Length: {len(model_text)} chars")
        print(f"{'='*80}\n")

        if not model_text or len(model_text) < 50:
            for q_key in valid_q:
                answers[q_key] = ""
            return answers

        q_blocks = re.split(r'(?=Question\s*\d+|Q\s*\d+[\.\)])', model_text, flags=re.I)
        q_blocks = [b.strip() for b in q_blocks if b.strip()]

        for block in q_blocks:
            q_num_match = re.search(r'(?:Question|Q)\s*(\d+)', block, re.I)
            if not q_num_match:
                continue

            q_num = q_num_match.group(1)
            q_key = f"Q{q_num}"

            if q_key not in valid_q:
                continue

            if q_key in qp_rubric:
                qp_question_text = qp_rubric[q_key]['text'].lower()
                qp_words = qp_question_text.split()[:15]
                qp_start = ' '.join(qp_words)

                block_lower = block.lower()
                qp_pos = block_lower.find(qp_start)
                if qp_pos!= -1:
                    qp_end = qp_pos + len(qp_question_text)
                    remaining = block[qp_end:].strip()
                    lines = remaining.split('\n')
                    for line in lines:
                        if len(line.strip()) > 20 and not re.match(r'^(?:Answer|Ans)', line, re.I):
                            answer_text = remaining[remaining.find(line):].strip()
                            break
                    else:
                        answer_text = remaining
                else:
                    lines = block.split('\n')
                    answer_text = '\n'.join(lines[3:]).strip() if len(lines) > 3 else block
            else:
                answer_text = block

            answer_text = re.sub(r'Page\s+\d+\s+of\s+\d+', '', answer_text, flags=re.I)
            answer_text = re.sub(r'MODEL\s+ANSWERS.*?SCHEME', '', answer_text, flags=re.I | re.DOTALL)
            answer_text = re.sub(r'Subject:.*?\n', '', answer_text, flags=re.I)
            answer_text = re.sub(r'Total\s+Marks:.*?\n', '', answer_text, flags=re.I)
            answer_text = re.sub(r'^\s*[\[\(]\d+\s*Marks?[\]\)]\s*\n', '', answer_text, flags=re.I | re.M)
            answer_text = re.sub(r'^\s*•\s*$', '', answer_text, flags=re.M)
            answer_text = re.sub(r'\n\s*\n+', '\n', answer_text).strip()

            if len(answer_text) > 50:
                answers[q_key] = answer_text
                print(f"[MODEL EXTRACT] {q_key}: {len(answer_text)} chars | Preview: {answer_text[:80]}...")
            else:
                answers[q_key] = ""

        for q_key in valid_q:
            if q_key not in answers:
                answers[q_key] = ""

        return answers

    def get_marking_positions(self, student_ans, model_ans, bboxes, page_num, percentage):
        if not bboxes:
            return [], [],[],[], []

        green_marks, red_marks, ticks, crosses, boxes = [], [],[],[], []

        def normalize_word(word):
            return self.lemmatizer.lemmatize(re.sub(r'[-_]', '', word.lower()))

        model_words_set = set()
        for w in word_tokenize(model_ans.lower()):
            if w.isalpha() and len(w) > 2 and w not in self.stop_words:
                model_words_set.add(normalize_word(w))

        is_good = percentage >= 60
        show_red = percentage < 60

        for bbox in bboxes:
            text = bbox['text'].strip()
            if len(text) < 1:
                continue

            text_norm = normalize_word(text.lower())
            conf = bbox.get('conf', 0)

            is_correct = False
            for model_word in model_words_set:
                if len(model_word) < 2:
                    continue
                if text_norm == model_word or model_word in text_norm or text_norm in model_word:
                    is_correct = True
                    break

            x, y, w, h = bbox['left'], bbox['top'], bbox['width'], bbox['height']
            bbox_page = bbox.get('page', page_num)

            if is_correct and conf > 20:
                green_marks.append({
                    'type': 'underline', 'color': '#00C853',
                    'x': x, 'y': y + h + 1, 'width': w, 'height': 3, 'page': bbox_page
                })
                ticks.append({
                    'type': 'tick', 'color': '#00C853',
                    'x': x + w + 5, 'y': y + h//2,
                    'size': 18, 'page': bbox_page
                })
                if is_good:
                    boxes.append({
                        'type': 'box', 'color': '#00C853',
                        'x': x - 2, 'y': y - 2,
                        'width': w + 4, 'height': h + 4,
                        'page': bbox_page, 'stroke': 2
                    })
            elif show_red and len(text) > 1:
                red_marks.append({
                    'type': 'underline', 'color': '#D50000',
                    'x': x, 'y': y + h + 1, 'width': w, 'height': 2, 'page': bbox_page
                })
                crosses.append({
                    'type': 'cross', 'color': '#D50000',
                    'x': x + w + 3, 'y': y + h//2,
                    'size': 16, 'page': bbox_page
                })

        return green_marks, red_marks, ticks, crosses, boxes

    def semantic_similarity_nlp(self, student_ans, model_ans):
        if not model_ans or len(model_ans) < 10 or not student_ans or len(student_ans) < 10:
            return {'sbert': 0.0, 'cosine': 0.0, 'jaccard': 0.0, 'ngram': 0.0, 'keywords': 0.0, 'semantic': 0.0}

        sbert_sim = 0.0
        sbert = self._load_sbert()
        if sbert:
            try:
                embeddings = sbert.encode([student_ans, model_ans])
                sbert_sim = float(cosine_similarity([embeddings[0]], [embeddings[1]])[0][0])
            except:
                sbert_sim = 0.0

        try:
            vectorizer = TfidfVectorizer(ngram_range=(1,2))
            tfidf = vectorizer.fit_transform([student_ans, model_ans])
            cosine_sim = float(cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0])
        except:
            cosine_sim = 0.0

        student_tokens = set(self.lemmatizer.lemmatize(t.lower()) for t in word_tokenize(student_ans)
                             if t.isalpha() and t.lower() not in self.stop_words and len(t) > 2)
        model_tokens = set(self.lemmatizer.lemmatize(t.lower()) for t in word_tokenize(model_ans)
                           if t.isalpha() and t.lower() not in self.stop_words and len(t) > 2)
        intersection = student_tokens & model_tokens
        union = student_tokens | model_tokens
        jaccard = len(intersection) / len(union) if union else 0.0
        keyword_match = len(intersection) / len(model_tokens) if model_tokens else 0.0

        def get_ngrams(tokens, n=2):
            return set([' '.join(tokens[i:i+n]) for i in range(len(tokens)-n+1)])
        student_ngrams = get_ngrams(list(student_tokens))
        model_ngrams = get_ngrams(list(model_tokens))
        ngram_overlap = len(student_ngrams & model_ngrams) / len(model_ngrams) if model_ngrams else 0.0

        semantic_match = sbert_sim * 0.7 + keyword_match * 0.3 if sbert_sim > 0 else keyword_match

        return {
            'sbert': round(sbert_sim, 3), 'cosine': round(cosine_sim, 3), 'jaccard': round(jaccard, 3),
            'ngram': round(ngram_overlap, 3), 'keywords': round(keyword_match, 3), 'semantic': round(semantic_match, 3)
        }

    def calculate_score_nlp(self, metrics, max_marks, student_ans="", keywords=None, model_ans=""):
        matched_kw = []

        if not model_ans or len(model_ans.strip()) < 20:
            print(f"[SCORE] Model Answer Empty - Score: 0/{max_marks}")
            return 0.0, matched_kw

        if len(student_ans.strip()) < 30:
            return 0.0, matched_kw

        sbert = metrics['sbert']
        keywords_score = metrics['keywords']

        if sbert == 0:
            print(f"[SCORE] SBERT 0 - No semantic match - Score: 0/{max_marks}")
            return 0.0, matched_kw

        if sbert >= 0.95: base_score = 0.98
        elif sbert >= 0.9: base_score = 0.95
        elif sbert >= 0.85: base_score = 0.90
        elif sbert >= 0.8: base_score = 0.85
        elif sbert >= 0.75: base_score = 0.80
        elif sbert >= 0.7: base_score = 0.75
        elif sbert >= 0.65: base_score = 0.70
        elif sbert >= 0.6: base_score = 0.65
        elif sbert >= 0.55: base_score = 0.60
        elif sbert >= 0.5: base_score = 0.55
        elif sbert >= 0.45: base_score = 0.50
        elif sbert >= 0.4: base_score = 0.45
        elif sbert >= 0.35: base_score = 0.40
        elif sbert >= 0.3: base_score = 0.35
        elif sbert >= 0.25: base_score = 0.30
        elif sbert >= 0.2: base_score = 0.25
        elif sbert >= 0.15: base_score = 0.20
        elif sbert >= 0.1: base_score = 0.15
        else: base_score = 0.05

        keyword_bonus = min(keywords_score * 0.98, 0.98)
        semantic_score = base_score * 0.70
        total_ratio = keyword_bonus + semantic_score

        raw_score = total_ratio * max_marks
        score = round(raw_score * 2) / 2

        score = min(score, max_marks)
        score = round(score * 2) / 2

        if keywords:
            student_lower = student_ans.lower()
            for kw in keywords:
                if kw.lower() in student_lower:
                    matched_kw.append(kw)

        return score, matched_kw

    def evaluate(self, student_text, model_text, qp_rubric, bboxes=None, student_images=None): # ✅ 1
        model_answers = self.extract_answers_from_model(model_text, qp_rubric.keys(), qp_rubric)

        results = []
        student_questions = self.split_into_questions(student_text, qp_rubric)
        total_score, total_max = 0, 0
        all_markings = {'green': [], 'red': [], 'ticks': [], 'crosses': [], 'boxes': [], 'front_page_circle': None} # ✅ 2

        question_page_map = {}

        if bboxes and student_questions:
            for q_num, q_ans in student_questions.items():
                q_words = set(q_ans.lower().split())
                page_match_count = {}

                for bbox in bboxes:
                    bbox_text = bbox["text"].lower().strip()
                    page = bbox.get("page", 0)

                    if len(bbox_text) > 2 and any(
                        bbox_text in word or word in bbox_text
                        for word in q_words
                    ):
                        if page in page_match_count: # ✅ BUG FIX
                            page_match_count[page] = page_match_count[page] + 1
                        else:
                            page_match_count[page] = 1

                if page_match_count:
                    question_page_map[q_num] = max(
                        page_match_count,
                        key=page_match_count.get
                    )
                else:
                    question_page_map[q_num] = 0

                print(f"[PAGE MAP] {q_num} -> Page {question_page_map[q_num]}")

        for idx, q_num in enumerate(sorted(qp_rubric.keys(), key=lambda x: int(x[1:]))):
            q_info = qp_rubric[q_num]
            max_marks = q_info['marks']
            q_text = q_info['text']
            keywords = q_info['keywords']
            total_max += max_marks
            student_ans = student_questions.get(q_num, "")
            model_ans = model_answers.get(q_num, "")

            print(f"\n {q_num}: Student={len(student_ans)} chars, Model={len(model_ans)} chars, Max={max_marks}")
            print(f"[Q TEXT] {q_text[:80]}...")
            print(f"[KEYWORDS] {keywords[:10]}")

            if not student_ans or len(student_ans) < 30:
                score = 0.0
                percentage = 0.0
                feedback = f"Not answered ({percentage:.1f}%)"
                metrics = {'sbert': 0.0, 'cosine': 0.0, 'jaccard': 0.0, 'ngram': 0.0, 'keywords': 0.0, 'semantic': 0.0}
                matched_keywords = []
            else:
                metrics = self.semantic_similarity_nlp(student_ans, model_ans)
                score, matched_keywords = self.calculate_score_nlp(metrics, max_marks, student_ans, keywords, model_ans)
                percentage = (score / max_marks * 100) if max_marks > 0 else 0.0
                if percentage >= 90: feedback = f"Excellent ({percentage:.1f}%)"
                elif percentage >= 75: feedback = f"Good ({percentage:.1f}%)"
                elif percentage >= 40: feedback = f"Average ({percentage:.1f}%)"
                else: feedback = f"Poor ({percentage:.1f}%)"

            q_page = question_page_map.get(q_num, 0)

            q_bboxes = []
            if bboxes:
                student_words = student_ans.lower().split()
                for bbox in bboxes: # ✅ SOB PAGE E MARKING
                    bbox_text = bbox['text'].lower().strip()
                    if len(bbox_text) > 1 and any(bbox_text in word or word in bbox_text for word in student_words):
                        q_bboxes.append(bbox)

            print(f"[BBOX DEBUG] {q_num}: Found {len(q_bboxes)} bboxes in ALL pages")

            if q_bboxes:
                green_marks, red_marks, ticks, crosses, boxes = self.get_marking_positions(student_ans, model_ans, q_bboxes, q_page, percentage)
                all_markings['green'].extend(green_marks)
                all_markings['red'].extend(red_marks)
                all_markings['ticks'].extend(ticks)
                all_markings['crosses'].extend(crosses)
                all_markings['boxes'].extend(boxes)

            print(f"[NLP SCORE] {q_num}: {score}/{max_marks} ({percentage:.1f}%) | SBERT:{metrics['sbert']} KEY:{metrics['keywords']} SEM:{metrics['semantic']}\n")
            results.append({
                'question': q_num, 'question_text': q_text, 'score': score, 'max_marks': max_marks,
                'percentage': round(percentage, 1), 'feedback': feedback, 'metrics': metrics,
                'keywords': keywords, 'matched_keywords': matched_keywords,
                'student_answer': student_ans
            })
            total_score += score

        extra_q = set(student_questions.keys()) - set(qp_rubric.keys())
        if extra_q:
            print(f"[WARNING] Extra questions written: {extra_q} - Ignored")

        # ✅ 3 FRONT PAGE CIRCLE
        if student_images and len(student_images) > 0:
            all_markings['front_page_circle'] = {'type': 'circle', 'color': '#FF6D00', 'x': 40, 'y': 80, 'width': 220, 'height': 90, 'page': 0, 'text': f"Total: {round(total_score * 2) / 2}/{total_max}"}
            print(f"[FRONT PAGE] Circle Added: {total_score}/{total_max}")

        total_score = round(total_score * 2) / 2
        print(f"[MARKINGS FINAL] Green: {len(all_markings['green'])}, Red: {len(all_markings['red'])}, Ticks: {len(all_markings['ticks'])}, Crosses: {len(all_markings['crosses'])}, Boxes: {len(all_markings['boxes'])}")

        return {
            'feedback': results,
            'total_score': total_score,
            'total_max': total_max,
            'percentage': round((total_score/total_max)*100, 1) if total_max > 0 else 0,
            'markings': all_markings
        }