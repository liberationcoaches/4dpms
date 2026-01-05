import openpyxl

wb = openpyxl.load_workbook('Execl/KRA Setting - 2025-26 (1).xlsx')

sheets_to_check = ['Organizational Dimension', 'Self Development', 'Developing Others']

for sheet_name in sheets_to_check:
    print(f"\n{'='*70}")
    print(f"Sheet: {sheet_name}")
    print(f"{'='*70}")
    ws = wb[sheet_name]
    
    # Check multiple rows for headers
    print("\nChecking rows 1-15 for headers:")
    for row_num in range(1, 16):
        row_data = []
        for col_num in range(1, 26):  # Check first 25 columns
            cell_val = ws.cell(row=row_num, column=col_num).value
            if cell_val and str(cell_val).strip():
                col_letter = chr(64 + col_num) if col_num <= 26 else f"{chr(64 + (col_num-1)//26)}{chr(64 + ((col_num-1)%26) + 1)}"
                row_data.append((col_letter, str(cell_val)[:50]))  # First 50 chars
        
        if len(row_data) >= 3:  # If row has at least 3 non-empty cells
            print(f"\n  Row {row_num} ({len(row_data)} columns):")
            for col, val in row_data[:15]:  # First 15 columns
                print(f"    {col}: {val}")

