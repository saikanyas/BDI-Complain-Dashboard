import pandas as pd

df = pd.read_excel('../complaints.xlsx')
print("=== complaints.xlsx ===")
print("Columns:", df.columns.tolist())
print("Rows:", len(df))
print(df.head(3).to_string())

print("\n=== models/result.xlsx ===")
r = pd.read_excel('../models/result.xlsx')
print("Columns:", r.columns.tolist())
print("Rows:", len(r))
print(r.head(3).to_string())
