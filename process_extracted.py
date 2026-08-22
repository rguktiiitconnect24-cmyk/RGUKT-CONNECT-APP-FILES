import json
import codecs

with open("extracted_line.json", "r", encoding="utf-16") as f:
    # powershell redirects often use utf-16
    content = f.read()
    
# fallback to utf-8 if utf-16 fails or is wrong
if not content.strip().startswith('{'):
    with open("extracted_line.json", "r", encoding="utf-8") as f:
        content = f.read()

data = json.loads(content.strip())
raw_text = data.get("content", "")

lines = raw_text.split("\n")
extracted = []
in_code = False
for l in lines:
    if l.startswith("1: "):
        in_code = True
    if in_code:
        if l.startswith("The above content does NOT show") or l.startswith("The above content does not show"):
            break
        
        idx = l.find(": ")
        if idx != -1:
            line_str = l[idx+2:]
            # The line might have \r at the end, let's strip it
            line_str = line_str.rstrip('\r')
            # It also might be split with \r\n, actually split("\n") handled \n, so \r is left.
            extracted.append(line_str)

with open(r"admin-panel\src\pages\Admin\FacultyAttendance_recovered.jsx", "w", encoding="utf-8") as f:
    f.write('\n'.join(extracted))

print(f"Recovered {len(extracted)} lines!")
