import pandas as pd
import json

try:
    file_path = r"c:\Users\bilij\Documents\iiit\rkvalley.xlsx"
    # Read the first few rows to understand structure
    df = pd.read_excel(file_path, nrows=5)
    
    print("Columns:", df.columns.tolist())
    print("\nFirst 5 rows:")
    print(df.to_string())
    
except Exception as e:
    print(f"Error reading Excel file: {e}")
