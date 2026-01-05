import openpyxl

wb = openpyxl.load_workbook('Execl/KRA Setting - 2025-26 (1).xlsx')

sheets_to_check = ['Organizational Dimension', 'Self Development', 'Developing Others']

for sheet_name in sheets_to_check:
    print(f"\n{'='*70}")
    print(f"Sheet: {sheet_name}")
    print('='*70)
    ws = wb[sheet_name]
    
    # Check first 30 rows more carefully
    print("\nFirst 30 rows analysis:\n")
    for row_num in range(1, 31):
        row_data = []
        for col in range(1, 26):  # Check first 25 columns
            cell = ws.cell(row=row_num, column=col)
            if cell.value:
                row_data.append((chr(64 + col), cell.value))
        
        if row_data:
            # Print row if it has meaningful content
            meaningful = [f"{col}: {val}" for col, val in row_data[:15] if val and str(val).strip() and len(str(val)) < 100]
            if meaningful:
                print(f"Row {row_num:2d}: {', '.join(meaningful[:8])}")
                if row_num > 10:  # After first 10 rows, only show if interesting
                    break

