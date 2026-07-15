import sqlite3
import json

def init_db():
    conn = sqlite3.connect('results.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            roll_no TEXT,
            subject_code TEXT,
            subject_name TEXT,
            name TEXT,
            max_marks REAL,
            marks_obtained REAL,
            criterion TEXT,
            feedback TEXT,
            teacher_feedback TEXT,
            image_paths TEXT,
            bboxes TEXT,
            markings TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(roll_no, subject_name)
        )
    ''')
    conn.commit()
    conn.close()
    print("[DB] Initialized")

def insert_result(roll_no, subject_code, subject_name, name, max_marks, marks_obtained, 
                  criterion, feedback, teacher_feedback, image_paths, bboxes, markings):
    conn = sqlite3.connect('results.db')
    cursor = conn.cursor()
    
    # ✅ 12টা Column = 12টা ? 
    cursor.execute('''
        INSERT OR REPLACE INTO results 
        (roll_no, subject_code, subject_name, name, max_marks, marks_obtained, 
         criterion, feedback, teacher_feedback, image_paths, bboxes, markings)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        roll_no, 
        subject_code, 
        subject_name, 
        name, 
        max_marks, 
        marks_obtained,
        json.dumps(criterion),      # ✅ JSON এখানে
        json.dumps(feedback),       # ✅ JSON এখানে  
        teacher_feedback, 
        json.dumps(image_paths),    # ✅ JSON এখানে
        json.dumps(bboxes),         # ✅ JSON এখানে
        json.dumps(markings)        # ✅ JSON এখানে
    ))
    
    conn.commit()
    conn.close()

def get_all_results():
    conn = sqlite3.connect('results.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM results ORDER BY timestamp DESC")
    rows = cursor.fetchall()
    
    results = []
    for row in rows:
        r = dict(row)
        r['image_paths'] = json.loads(r['image_paths']) if r['image_paths'] else []
        r['bboxes'] = json.loads(r['bboxes']) if r['bboxes'] else []
        r['markings'] = json.loads(r['markings']) if r['markings'] else {}
        r['feedback'] = json.loads(r['feedback']) if r['feedback'] else []
        r['criterion'] = json.loads(r['criterion']) if r['criterion'] else []
        results.append(r)
    
    conn.close()
    return results

def get_result_by_roll(roll_no, subject_name=None):
    conn = sqlite3.connect('results.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    if subject_name:
        cursor.execute(
            "SELECT * FROM results WHERE roll_no = ? AND subject_name = ?", 
            (roll_no, subject_name)
        )
    else:
        cursor.execute("SELECT * FROM results WHERE roll_no = ?", (roll_no,))
    
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None
    
    result = dict(row)
    result['image_paths'] = json.loads(result['image_paths']) if result['image_paths'] else []
    result['bboxes'] = json.loads(result['bboxes']) if result['bboxes'] else []
    result['markings'] = json.loads(result['markings']) if result['markings'] else {}
    result['feedback'] = json.loads(result['feedback']) if result['feedback'] else []
    result['criterion'] = json.loads(result['criterion']) if result['criterion'] else []
    
    conn.close()
    return result

def delete_result(roll_no, subject_name=None):
    conn = sqlite3.connect('results.db')
    cursor = conn.cursor()
    
    if subject_name:
        cursor.execute(
            "DELETE FROM results WHERE roll_no = ? AND subject_name = ?", 
            (roll_no, subject_name)
        )
        print(f"[DB DELETE] Roll: {roll_no} | Subject: {subject_name}")
    else:
        print(f"[DB WARNING] Deleting ALL subjects for Roll: {roll_no}")
        cursor.execute("DELETE FROM results WHERE roll_no = ?", (roll_no,))
    
    deleted = cursor.rowcount
    conn.commit()
    conn.close()
    return deleted > 0