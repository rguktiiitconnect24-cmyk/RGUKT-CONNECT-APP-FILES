import json

transcript_path = r"C:\Users\bilij\.gemini\antigravity-ide\brain\f6f96ad2-f932-48f6-b414-6a0bb519e5cd\.system_generated\logs\transcript_full.jsonl"
file_content = []

with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            if data.get('type') == 'TOOL_RESPONSE':
                content = data.get('content', '')
                if 'Total Bytes: 54009' in content:
                    lines = content.split('\n')
                    in_code = False
                    for l in lines:
                        if l.startswith('1: '):
                            in_code = True
                        if in_code:
                            if l.startswith('The above content does NOT show'):
                                break
                            idx = l.find(': ')
                            if idx != -1:
                                file_content.append(l[idx+2:])
                    break
        except Exception as e:
            pass

print(f"Extracted {len(file_content)} lines.")
if file_content:
    with open(r"c:\Users\bilij\Documents\projects\iiit\admin-panel\src\pages\Admin\FacultyAttendance_recovered.jsx", "w", encoding="utf-8") as out:
        out.write('\n'.join(file_content))
