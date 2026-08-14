
import pandas as pd
import json

try:
    # Read the Excel file
    df = pd.read_excel('rkvalley.xlsx')
    
    # Convert to a list of dictionaries
    # Assuming columns like 'ID', 'Name', etc. exist. 
    # visual inspection of first few rows would be ideal, but for now let's dump structure
    records = df.to_dict(orient='records')
    
    # Clean up data (handle NaN, convert to string where appropriate)
    cleaned_records = []
    for record in records:
        clean_record = {}
        for k, v in record.items():
            if pd.isna(v):
                clean_record[k] = None
            else:
                clean_record[k] = str(v).strip()
        cleaned_records.append(clean_record)

    print(json.dumps(cleaned_records, indent=2))

except Exception as e:
    print(f"Error: {e}")
